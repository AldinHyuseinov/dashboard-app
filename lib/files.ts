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

/**
 * Which bytes to read, as a Range request asks for them: from `start` to
 * `end` inclusive (to the last byte when `end` is left out, or runs past
 * it), or the last `suffix` bytes.
 */
export type RangeRequest = { start: number; end?: number } | { suffix: number };

/** Bytes `start` to `end` of a file, both inclusive. */
export type ByteRange = { start: number; end: number };

/** What is known about a stored file without reading its bytes. */
export type FileInfo = { fileName: string; fileType: string; size: number };

export type ReadResult =
  | {
      ok: true;
      file: FileInfo;
      /** The bytes `body` holds, or null when it holds the whole file. */
      range: ByteRange | null;
      body: ReadableStream<Uint8Array>;
    }
  | { ok: false; reason: "unauthenticated" | "not-found" }
  | { ok: false; reason: "unsatisfiable"; size: number };

export type FileDeps = {
  /** Converts a video to mp4, at most 5 minutes long. Throws if it can't. */
  compressVideo: (video: Buffer) => Promise<Buffer>;
};

/** How many bytes one query reads, so serving a file never holds all of it in memory. */
const SLICE_BYTES = 1024 * 1024;

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

  /**
   * A file's name, type and size, and a stream of its bytes: all of them,
   * or only those `range` asks for. Only signed-in users may read files.
   * The bytes are read a slice at a time as the stream is consumed.
   */
  async function read(
    actor: Actor | null,
    fileId: string,
    { range }: { range?: RangeRequest } = {},
  ): Promise<ReadResult> {
    if (!actor) return { ok: false, reason: "unauthenticated" };

    const [file] = await prisma.$queryRaw<FileInfo[]>`
      SELECT [fileName], [fileType], CAST(DATALENGTH([data]) AS INT) AS [size]
      FROM [dbo].[TaskFile] WHERE [id] = ${fileId}`;
    if (!file) return { ok: false, reason: "not-found" };

    const selected = range ? resolveRange(range, file.size) : { start: 0, end: file.size - 1 };
    if (!selected) return { ok: false, reason: "unsatisfiable", size: file.size };

    return {
      ok: true,
      file,
      range: range ? selected : null,
      body: streamBytes(fileId, selected),
    };
  }

  return { upload, read };
}

/** The bytes a Range request selects from a file of `size` bytes, or null if it selects none. */
function resolveRange(range: RangeRequest, size: number): ByteRange | null {
  if ("suffix" in range) {
    if (range.suffix <= 0 || size === 0) return null;
    return { start: Math.max(0, size - range.suffix), end: size - 1 };
  }
  if (range.start >= size) return null;
  return { start: range.start, end: Math.min(range.end ?? size - 1, size - 1) };
}

/**
 * Streams bytes `start` to `end` of a stored file, reading one slice per
 * query only when the consumer asks for more. An `end` before `start`
 * streams nothing (an empty file).
 */
function streamBytes(fileId: string, { start, end }: ByteRange): ReadableStream<Uint8Array> {
  let next = start;
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (next > end) return controller.close();
        const length = Math.min(SLICE_BYTES, end - next + 1);
        // SQL Server's SUBSTRING counts from 1.
        const [row] = await prisma.$queryRaw<{ slice: Uint8Array }[]>`
          SELECT SUBSTRING([data], ${next + 1}, ${length}) AS [slice]
          FROM [dbo].[TaskFile] WHERE [id] = ${fileId}`;
        if (!row || row.slice.length !== length) {
          return controller.error(new Error(`File ${fileId} changed while it was being read.`));
        }
        controller.enqueue(new Uint8Array(row.slice));
        next += length;
      },
    },
    // Nothing is read until the consumer asks for it.
    { highWaterMark: 0 },
  );
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
