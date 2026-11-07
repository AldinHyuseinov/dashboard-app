import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/lib/actor";
import { MAX_FILE_SIZE, MAX_FILES } from "@/lib/constants";
import { compressVideo } from "@/lib/video";

/** What the upload route receives: a browser `File`, or anything shaped like one. */
type UploadedFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

export type UploadResult =
  | { ok: true; file: { id: string } }
  | { ok: false; reason: "invalid" | "processing-failed"; error: string };

export type DownloadResult =
  | { ok: true; file: { fileName: string; fileType: string; data: Uint8Array<ArrayBuffer> } }
  | { ok: false; reason: "unauthenticated" | "not-found" };

export type FileDeps = {
  /** Converts a video to mp4, at most 5 minutes long. Throws if it can't. */
  compressVideo: (video: Buffer) => Promise<Buffer>;
};

/** Uploads never attached to a Task are deleted once they are this old. */
const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;

const NO_FILE = "Няма избран файл.";
const VIDEO_FAILED = "Грешка при обработка на видеото. (Макс. дължина: 5 минути.)";
const NOT_ATTACHABLE = "Някои от файловете не могат да бъдат прикачени. Качете ги отново.";

const tooLarge = (fileName: string) =>
  `Файлът "${fileName}" е твърде голям. Максималният размер е ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;

/**
 * Builds the Files module around its collaborators. Production code uses
 * the default instance exported below; tests replace FFmpeg.
 */
export function createFiles({ compressVideo }: FileDeps) {
  /**
   * Stores a file the Actor uploaded, unattached until a Task takes it.
   * Images become webp at most 1280px wide (kept as uploaded if that
   * fails); videos become mp4. Also deletes abandoned uploads.
   */
  async function upload(
    actor: Actor,
    { file, now }: { file: UploadedFile | null; now: Date },
  ): Promise<UploadResult> {
    if (!file) return { ok: false, reason: "invalid", error: NO_FILE };
    if (file.size > MAX_FILE_SIZE) return { ok: false, reason: "invalid", error: tooLarge(file.name) };

    let data = Buffer.from(await file.arrayBuffer());
    let fileType = file.type;
    let fileName = file.name;

    if (file.type.startsWith("image/")) {
      try {
        data = Buffer.from(
          await sharp(data)
            .resize({ width: 1280, withoutEnlargement: true })
            .webp({ quality: 75 })
            .toBuffer(),
        );
        fileType = "image/webp";
      } catch (error) {
        console.log("Failed to compress image:", error);
      }
    }

    if (file.type.startsWith("video/")) {
      try {
        data = Buffer.from(await compressVideo(data));
      } catch (error) {
        console.error("Native FFmpeg compression failed", error);
        return { ok: false, reason: "processing-failed", error: VIDEO_FAILED };
      }
      fileType = "video/mp4";
      fileName = file.name.replace(/\.[^/.]+$/, "") + ".mp4";
    }

    const saved = await prisma.taskFile.create({
      data: { fileName, fileType, data, createdAt: now, uploader: { connect: { id: actor.id } } },
      select: { id: true },
    });

    // There's no scheduler on the hosting platform, so uploads drive cleanup.
    try {
      await deleteAbandoned(now);
    } catch (error) {
      console.error("Abandoned upload cleanup failed:", error);
    }

    return { ok: true, file: saved };
  }

  /** A file's name, type and bytes. Only signed-in users may download files. */
  async function download(actor: Actor | null, fileId: string): Promise<DownloadResult> {
    if (!actor) return { ok: false, reason: "unauthenticated" };

    const file = await prisma.taskFile.findUnique({
      where: { id: fileId },
      select: { fileName: true, fileType: true, data: true },
    });
    if (!file) return { ok: false, reason: "not-found" };
    return { ok: true, file };
  }

  return { upload, download };
}

/** Deletes files not attached to any Task that are more than 24 hours old at `now`. */
async function deleteAbandoned(now: Date) {
  await prisma.taskFile.deleteMany({
    where: { taskId: null, createdAt: { lt: new Date(now.getTime() - ABANDONED_AFTER_MS) } },
  });
}

/** Why a Task's files couldn't be changed, as the message for the form's file field. */
export class TaskFilesRefused extends Error {}

/**
 * Changes which files are on a Task, inside the caller's transaction: removes
 * `removedFileIds` that are on the Task, then attaches `addedFileIds`. Throws
 * `TaskFilesRefused`, so the caller's transaction rolls back, when the Task
 * would end up with more than 10 files, or when any added file is not an
 * unattached upload by the Actor. Another Task's files are never taken.
 */
export async function changeTaskFiles(
  tx: Prisma.TransactionClient,
  actor: Actor,
  {
    taskId,
    addedFileIds,
    removedFileIds = [],
  }: { taskId: string; addedFileIds: string[]; removedFileIds?: string[] },
) {
  const added = [...new Set(addedFileIds)];
  const removed = [...new Set(removedFileIds)];

  const { count: removedCount } =
    removed.length > 0
      ? await tx.taskFile.deleteMany({ where: { taskId, id: { in: removed } } })
      : { count: 0 };
  const kept = await tx.taskFile.count({ where: { taskId } });

  if (kept + added.length > MAX_FILES) {
    throw new TaskFilesRefused(
      kept + removedCount > 0
        ? `Тази задача вече има ${kept} запазени файла. Можете да добавите максимум още ${MAX_FILES - kept}.`
        : `Можете да прикачите максимум ${MAX_FILES} файла.`,
    );
  }
  if (added.length === 0) return;

  const { count: attached } = await tx.taskFile.updateMany({
    where: { id: { in: added }, taskId: null, uploaderId: actor.id },
    data: { taskId },
  });
  if (attached !== added.length) throw new TaskFilesRefused(NOT_ATTACHABLE);
}

export const files = createFiles({ compressVideo });
