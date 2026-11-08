import { IMAGE_TYPES } from "@/lib/constants";

/** The largest photo a Profile picture is made from. */
export const MAX_PICTURE_SIZE = 10 * 1024 * 1024;

export const NO_PICTURE = "Няма избрана снимка.";
export const UNSUPPORTED_PICTURE = "Изберете снимка във формат JPEG, PNG, WebP или GIF.";
export const PICTURE_TOO_LARGE = `Снимката е твърде голяма. Максималният размер е ${MAX_PICTURE_SIZE / (1024 * 1024)}MB.`;

/**
 * Why a chosen file can't become a Profile picture, judged by its declared
 * type and size alone, or null when it may be sent. The Profile checks this
 * before uploading; the Profile pictures module checks it again, and also
 * checks the bytes.
 */
export function pictureProblem(file: { type: string; size: number }): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return UNSUPPORTED_PICTURE;
  if (file.size > MAX_PICTURE_SIZE) return PICTURE_TOO_LARGE;
  return null;
}
