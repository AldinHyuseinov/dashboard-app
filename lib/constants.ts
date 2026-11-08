export const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB Server-side limit as backup
export const MAX_FILES = 10; // Max number of files allowed
export const ITEMS_PER_PAGE = 5;
/**
 * The image types a Task takes: those every device shows. Leaving HEIC out
 * of the pickers makes iPhones convert their photos to JPEG before uploading.
 */
export const IMAGE_TYPES: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
/** What the camera and photo library pickers offer: common images and video. */
export const MEDIA_ACCEPT = [...IMAGE_TYPES, "video/*"].join(",");
/** What the document picker offers. */
export const DOCUMENT_ACCEPT = ".pdf,application/pdf";
/** What the one desktop picker offers: common images, video and PDF. */
export const UPLOAD_ACCEPT = `${MEDIA_ACCEPT},${DOCUMENT_ACCEPT}`;
/** How many Activities one page of the Activity Feed shows. */
export const FEED_ITEMS_PER_PAGE = 20;
/**
 * How soon after the Task Owner's last edit a further edit is merged into
 * the same "Task edited" Activity, without notifying anyone again.
 */
export const EDIT_MERGE_WINDOW_MS = 10 * 60 * 1000;

/** The emojis the UI offers for Reactions; the Comments module accepts no others. */
export const REACTION_EMOJIS: readonly string[] = ["❤️", "🤣", "😮", "😥", "😡", "👍", "👎", "👏"];
/**
 * The longest video a Task can carry, in seconds. The form refuses longer
 * videos; one whose length the browser can't read is cut to this on the server.
 */
export const MAX_VIDEO_SECONDS = 5 * 60;
