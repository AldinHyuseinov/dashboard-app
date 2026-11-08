/**
 * The New and Edit task form's own rules: what a draft still needs, which
 * picked files fit the limits, and how uploads and files are described.
 * On the server, the Tasks module refuses more than 10 files and the Files
 * module files over 300 MB; checking here spares people a long upload. The
 * file types and the 5-minute video length are only checked here: the server
 * converts any image it's sent and keeps the first 5 minutes of a video.
 */

import { isCategory } from "@/lib/categories";
import { IMAGE_TYPES, MAX_FILE_SIZE, MAX_FILES, MAX_VIDEO_SECONDS } from "@/lib/constants";

export type Draft = { category: string; title: string; description: string };
export type DraftErrors = Partial<Record<keyof Draft, string>>;

/** What a draft still needs before it can be published, by field. */
export function draftErrors({ category, title, description }: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!isCategory(category)) errors.category = "Изберете категория.";
  if (!title.trim()) errors.title = "Въведете заглавие.";
  if (!description.trim()) errors.description = "Въведете описание.";
  return errors;
}

/** A file someone picked, with a video's length when the browser could read it. */
export type PickedFile = { name: string; size: number; type: string; durationSeconds?: number };

const MAX_MB = MAX_FILE_SIZE / (1024 * 1024);

/** Whether a Task can carry this sort of file: a common image, a video or a PDF. */
function isAttachable({ type, name }: PickedFile): boolean {
  const kind = fileKind(type, name);
  return kind === "video" || kind === "pdf" || (kind === "image" && IMAGE_TYPES.includes(type));
}

/**
 * Which picked files can be added, with `room` places left on the Task, and
 * why the others can't: not an image, video or PDF the app shows everywhere
 * (a file dropped in skips the picker's filter), over 300 MB, a video over
 * 5 minutes, or no room.
 */
export function checkPicked<F extends PickedFile>(
  picked: readonly F[],
  { room }: { room: number },
): { accepted: F[]; errors: string[] } {
  const accepted: F[] = [];
  const errors: string[] = [];
  let leftOut = 0;

  for (const file of picked) {
    if (!isAttachable(file)) {
      errors.push(
        `„${file.name}“ не може да се прикачи. Изберете снимка (JPEG, PNG, WebP или GIF), видео или PDF.`,
      );
    } else if (file.size > MAX_FILE_SIZE) {
      errors.push(`„${file.name}“ е по-голям от ${MAX_MB} MB. Изберете по-малък файл.`);
    } else if ((file.durationSeconds ?? 0) > MAX_VIDEO_SECONDS) {
      errors.push(
        `Видеото „${file.name}“ е по-дълго от ${MAX_VIDEO_SECONDS / 60} минути. Съкратете го и го добавете отново.`,
      );
    } else if (accepted.length >= room) {
      leftOut += 1;
    } else {
      accepted.push(file);
    }
  }

  if (leftOut > 0) {
    errors.push(
      `Задачата може да има най-много ${MAX_FILES} файла. ${
        leftOut === 1 ? "1 файл не беше добавен." : `${leftOut} файла не бяха добавени.`
      }`,
    );
  }
  return { accepted, errors };
}

/** How the upload of file `index` (from 0) of `total` is going, with `sent` from 0 to 1. */
export function uploadStatus({ index, total, sent }: { index: number; total: number; sent: number }) {
  const which = `файл ${index + 1} от ${total}`;
  if (sent >= 1) return `Обработка на ${which}…`;
  return `Качване на ${which} · ${Math.round(sent * 100)}%`;
}

const NUMBER = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 1 });

/** A file's size as people read it: "180 KB", "2,4 MB". */
export function fileSizeLabel(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${NUMBER.format(mb >= 10 ? Math.round(mb) : mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export type FileKind = "image" | "video" | "pdf" | "file";

/** What each sort of file is called on screen. */
export const FILE_KIND_LABEL: Record<FileKind, string> = {
  image: "Снимка",
  video: "Видео",
  pdf: "PDF",
  file: "Файл",
};

/** The limits, as the form tells people before they pick. */
export const LIMITS_HINT = `Снимки, видео до ${MAX_VIDEO_SECONDS / 60} минути и документи до ${MAX_MB} MB.`;

/** What sort of file it is, from its type, or its name when the type says nothing useful. */
export function fileKind(type: string, name: string): FileKind {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  return "file";
}
