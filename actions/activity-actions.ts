"use server";

import { activity, type FeedPage } from "@/lib/activity";
import { requireActor } from "@/lib/session";

/** The Feed was shown at `shownAt`: everything in it is no longer Unread. */
export async function markFeedSeenAction(shownAt: Date) {
  const actor = await requireActor();
  await activity.markFeedSeen(actor, { shownAt: asDate(shownAt), now: new Date() });
}

/** A Task was shown at `shownAt`: its Activities up to then are no longer Unread. */
export async function markTaskOpenedAction(taskId: string, shownAt: Date) {
  const actor = await requireActor();
  await activity.markTaskOpened(actor, {
    taskId: String(taskId),
    shownAt: asDate(shownAt),
    now: new Date(),
  });
}

/** The client's time, if it sent a valid one. */
function asDate(value: unknown): Date | undefined {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : undefined;
}

/** The Feed items older than those already shown, where `older` says they continue. */
export async function olderFeedItemsAction(older: string): Promise<FeedPage> {
  const actor = await requireActor();
  return activity.feed(actor, { older: String(older) });
}
