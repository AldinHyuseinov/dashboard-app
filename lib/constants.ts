export const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB Server-side limit as backup
export const MAX_FILES = 10; // Max number of files allowed
export const ITEMS_PER_PAGE = 5;
/**
 * What the upload picker offers: common image types, video and PDF. Leaving
 * HEIC out makes iPhones convert their photos to JPEG before uploading.
 */
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/*,.pdf";
/** How many Activities one page of the Activity Feed shows. */
export const FEED_ITEMS_PER_PAGE = 20;
/**
 * How soon after the Task Owner's last edit a further edit is merged into
 * the same "Task edited" Activity, without notifying anyone again.
 */
export const EDIT_MERGE_WINDOW_MS = 10 * 60 * 1000;

/** The emojis the UI offers for Reactions; the Comments module accepts no others. */
export const REACTION_EMOJIS: readonly string[] = ["❤️", "🤣", "😮", "😥", "😡", "👍", "👎", "👏"];
