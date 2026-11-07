import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { categoryLabelOrSlug } from "@/lib/categories";
import { EDIT_MERGE_WINDOW_MS, FEED_ITEMS_PER_PAGE } from "@/lib/constants";

/** What happened. Reactions are not Activities. */
export type ActivityType =
  | "task-created"
  | "task-edited"
  | "task-deleted"
  | "task-done"
  | "task-not-done"
  | "comment-posted"
  | "reply-posted";

type CommentActivityType = Extract<ActivityType, "comment-posted" | "reply-posted">;

/** The Task an Activity concerns, as it is when the Activity is recorded. */
export type ActivityTask = { id: string; title: string; category: string };

/** One Activity as the Feed shows it. */
export type FeedItem = {
  id: string;
  type: ActivityType;
  actor: { id: string; name: string };
  occurredAt: Date;
  /**
   * The Task's current title while it exists. Once it's deleted, its last
   * title, and `deleted` is set: the item can no longer be opened.
   */
  task: { id: string; title: string; category: string; categoryLabel: string; deleted: boolean };
  /** For Comment and Reply Activities: the start of the Comment's current text. */
  comment: { id: string; excerpt: string } | null;
  /** Whether the user viewing the Feed hasn't seen it yet (see `unreadWhere`). */
  unread: boolean;
};

/** One page of the Activity Feed. */
export type FeedPage = { items: FeedItem[]; currentPage: number; totalPages: number };

/** How many characters of a Comment's text a Feed item shows. */
const EXCERPT_LENGTH = 100;

/**
 * Records an Activity inside the caller's transaction, so it is stored if
 * and only if the change it describes is. Comment and Reply Activities name
 * the Comment posted, and are deleted together with it.
 */
export async function recordActivity(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: { task: ActivityTask; now: Date } & (
    | { type: Exclude<ActivityType, CommentActivityType> }
    | { type: CommentActivityType; commentId: string }
  ),
) {
  await tx.activity.create({
    data: {
      type: input.type,
      actorId: actor.id,
      taskId: input.task.id,
      taskTitle: input.task.title,
      taskCategory: input.task.category,
      commentId: "commentId" in input ? input.commentId : null,
      occurredAt: input.now,
    },
  });
}

/**
 * Records that the Actor edited a Task, inside the caller's transaction.
 * When that Task's latest "Task edited" Activity is the same Actor's and
 * happened no more than `EDIT_MERGE_WINDOW_MS` before `now`, it is reused
 * instead and its time moves to `now`. Since the window counts from that
 * moved time, a run of edits each close to the last stays one Activity.
 * `merged` tells the caller not to notify anyone a second time.
 */
export async function recordTaskEdited(
  tx: Prisma.TransactionClient,
  actor: Actor,
  { task, now }: { task: ActivityTask; now: Date },
): Promise<{ merged: boolean }> {
  const latestEdit = await tx.activity.findFirst({
    where: { taskId: task.id, type: "task-edited" },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    select: { id: true, actorId: true, occurredAt: true },
  });

  const mergeable =
    latestEdit !== null &&
    latestEdit.actorId === actor.id &&
    now.getTime() - latestEdit.occurredAt.getTime() <= EDIT_MERGE_WINDOW_MS;
  if (!mergeable) {
    await recordActivity(tx, actor, { type: "task-edited", task, now });
    return { merged: false };
  }

  await tx.activity.update({ where: { id: latestEdit.id }, data: { occurredAt: now } });
  return { merged: true };
}

/**
 * Records that a Task was deleted, inside the caller's transaction. Its
 * earlier Activities take on its last title, so all of a deleted Task's
 * items name it the same way.
 */
export async function recordTaskDeleted(
  tx: Prisma.TransactionClient,
  actor: Actor,
  { task, now }: { task: ActivityTask; now: Date },
) {
  await tx.activity.updateMany({ where: { taskId: task.id }, data: { taskTitle: task.title } });
  await recordActivity(tx, actor, { type: "task-deleted", task, now });
}

/** The start of a Comment's text, as a Feed item shows it. */
function excerpt(text: string): string {
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
}

/**
 * The Unread rule, as a condition on the Activity `a`: it is Unread for the
 * Actor when someone else caused it, and it's newer than both their
 * last Feed visit (if any) and their last opening of its Task (if any).
 */
function unreadWhere(actor: Actor) {
  return Prisma.sql`
    a.[actorId] <> ${actor.id}
    AND NOT EXISTS (
      SELECT 1 FROM [dbo].[user] u
      WHERE u.[id] = ${actor.id} AND u.[lastFeedVisitAt] >= a.[occurredAt]
    )
    AND NOT EXISTS (
      SELECT 1 FROM [dbo].[TaskOpening] o
      WHERE o.[userId] = ${actor.id} AND o.[taskId] = a.[taskId] AND o.[openedAt] >= a.[occurredAt]
    )`;
}

/** Which of `activityIds` are Unread for the Actor. */
async function unreadAmong(actor: Actor, activityIds: string[]): Promise<Set<string>> {
  if (activityIds.length === 0) return new Set();
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT a.[id] FROM [dbo].[Activity] a
    WHERE a.[id] IN (${Prisma.join(activityIds)}) AND ${unreadWhere(actor)}`;
  return new Set(rows.map((row) => row.id));
}

/**
 * Up to when a screen counts as seen: when it was shown (by default, `now`,
 * when the visit is recorded), but never later than `now`. The time a screen
 * was shown comes back from the person's device, so it can't be trusted to
 * lie in the past.
 */
function shownUntil(shownAt: Date | undefined, now: Date): Date {
  return shownAt && shownAt.getTime() < now.getTime() ? shownAt : now;
}

/** Builds the Activity module. */
export function createActivity() {
  /**
   * One page of the Activity Feed, newest first. It is the same for every
   * user. A page number below 1 is treated as the first page.
   * A page number past the end is treated as the last page.
   */
  async function feed(actor: Actor, { page }: { page: number }): Promise<FeedPage> {
    const { rows, currentPage, totalPages } = await prisma.$transaction(async (tx) => {
      const totalPages = Math.ceil((await tx.activity.count()) / FEED_ITEMS_PER_PAGE);
      const currentPage = Math.max(1, Math.min(Math.floor(page) || 1, totalPages));
      const rows = await tx.activity.findMany({
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip: (currentPage - 1) * FEED_ITEMS_PER_PAGE,
        take: FEED_ITEMS_PER_PAGE,
        include: {
          actor: { select: { id: true, name: true } },
          comment: { select: { id: true, text: true } },
        },
      });
      return { rows, currentPage, totalPages };
    });

    // Not a relation (Activities outlive their Task), so the Tasks that still
    // exist are looked up separately for their current titles.
    const liveTasks = await prisma.task.findMany({
      where: { id: { in: [...new Set(rows.map((row) => row.taskId))] } },
      select: { id: true, title: true },
    });
    const currentTitles = new Map(liveTasks.map((task) => [task.id, task.title]));
    const unread = await unreadAmong(actor, rows.map((row) => row.id));

    const items = rows.map((row): FeedItem => ({
      id: row.id,
      type: row.type as ActivityType,
      actor: row.actor,
      occurredAt: row.occurredAt,
      task: {
        id: row.taskId,
        title: currentTitles.get(row.taskId) ?? row.taskTitle,
        category: row.taskCategory,
        categoryLabel: categoryLabelOrSlug(row.taskCategory),
        deleted: !currentTitles.has(row.taskId),
      },
      comment: row.comment ? { id: row.comment.id, excerpt: excerpt(row.comment.text) } : null,
      unread: unread.has(row.id),
    }));
    return { items, currentPage, totalPages };
  }

  /**
   * Records that the Actor opened the Activity Feed: everything up to the
   * moment it was shown is no longer Unread for them. An earlier time than
   * their last visit changes nothing, so nothing becomes Unread again.
   */
  async function markFeedSeen(actor: Actor, { shownAt, now }: { shownAt?: Date; now: Date }) {
    const seenAt = shownUntil(shownAt, now);
    await prisma.user.updateMany({
      where: { id: actor.id, OR: [{ lastFeedVisitAt: null }, { lastFeedVisitAt: { lt: seenAt } }] },
      data: { lastFeedVisitAt: seenAt },
    });
  }

  /**
   * Records that the Actor opened a Task: its Activities up to the moment it
   * was shown are no longer Unread for them. As with the Feed, an earlier
   * time than their last opening changes nothing.
   */
  async function markTaskOpened(
    actor: Actor,
    { taskId, shownAt, now }: { taskId: string; shownAt?: Date; now: Date },
  ) {
    const openedAt = shownUntil(shownAt, now);
    const key = { userId: actor.id, taskId };
    const { count } = await prisma.taskOpening.updateMany({
      where: { ...key, openedAt: { lt: openedAt } },
      data: { openedAt },
    });
    if (count > 0) return;

    try {
      await prisma.taskOpening.create({ data: { ...key, openedAt } });
    } catch (error) {
      // Already opened at this time or later, perhaps just now in another tab.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
  }

  /** How many Activities are Unread for the Actor: the navigation's count and the app's badge. */
  async function unreadCount(actor: Actor): Promise<number> {
    const [{ count }] = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) AS [count] FROM [dbo].[Activity] a WHERE ${unreadWhere(actor)}`;
    return count;
  }

  return { feed, markFeedSeen, markTaskOpened, unreadCount };
}

export const activity = createActivity();
