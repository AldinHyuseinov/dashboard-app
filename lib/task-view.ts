/** How a Task's own details read on its screen. */

import { whenShort } from "@/lib/sofia-time";

type Dated = { createdAt: Date; updatedAt: Date };

/** Saving a Task can move its update time a moment past its creation; that isn't an update. */
const SAVE_SLACK_MS = 2000;

/** Whether the Task changed after it was posted. */
export function wasUpdated({ createdAt, updatedAt }: Dated): boolean {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > SAVE_SLACK_MS;
}

/** When the Task was posted and, if it changed since, last updated: "12 октомври, обновена днес, 09:05". */
export function postedLine(task: Dated, now: Date): string {
  const posted = whenShort(new Date(task.createdAt), now);
  return wasUpdated(task) ? `${posted}, обновена ${whenShort(new Date(task.updatedAt), now)}` : posted;
}
