import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { recordActivity } from "@/lib/activity";
import { REACTION_EMOJIS } from "@/lib/constants";
import {
  notifications as defaultNotifications,
  type Notifications,
} from "@/lib/notifications";

/** The Comment a rule applied to, with its Task's id and Category for refreshing pages. */
export type CommentResult =
  | { ok: true; comment: { id: string; taskId: string; category: string } }
  | { ok: false; error: string };

export type CommentDeps = {
  notifications: Pick<Notifications, "notify">;
};

const EMPTY_TEXT = "Коментарът не може да бъде празен.";
const TASK_NOT_FOUND = "Задачата не е намерена.";
const COMMENT_NOT_FOUND = "Коментарът не е намерен.";
const REPLY_ON_ANOTHER_TASK = "Може да се отговаря само на коментари по същата задача.";
const ONLY_THE_AUTHOR_EDITS = "Само авторът може да редактира коментара.";
const ONLY_THE_AUTHOR_DELETES = "Само авторът може да изтрие коментара.";
const EMOJI_NOT_OFFERED = "Тази реакция не е позволена.";
const ONLY_THE_OWNER_PINS = "Само собственикът на задачата може да закача коментари.";
const REPLIES_ARE_NOT_PINNED = "Отговорите не могат да бъдат закачани.";

/**
 * Builds the Comments module around its collaborators. Production code uses
 * the default instance exported below; tests inject in-memory adapters.
 */
export function createComments({ notifications }: CommentDeps) {
  /**
   * Posts a Comment on a Task, or a Reply when `replyToId` names the Comment
   * being answered, which the Reply records. Threads are one level deep: a
   * Reply to a Reply is filed under the thread's top-level Comment.
   */
  async function post(
    actor: Actor,
    input: { taskId: string; text: string; replyToId?: string | null; now: Date },
  ): Promise<CommentResult> {
    const text = input.text.trim();
    if (!text) return { ok: false, error: EMPTY_TEXT };

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, title: true, category: true, userId: true },
    });
    if (!task) return { ok: false, error: TASK_NOT_FOUND };

    const answered = input.replyToId
      ? await prisma.comment.findUnique({
          where: { id: input.replyToId },
          select: { id: true, taskId: true, parentId: true, userId: true },
        })
      : null;
    if (input.replyToId && !answered) return { ok: false, error: COMMENT_NOT_FOUND };
    if (answered && answered.taskId !== task.id) return { ok: false, error: REPLY_ON_ANOTHER_TASK };
    const parentId = answered ? (answered.parentId ?? answered.id) : null;

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          text,
          taskId: task.id,
          userId: actor.id,
          parentId,
          answersId: answered?.id ?? null,
          createdAt: input.now,
        },
        select: { id: true },
      });
      await recordActivity(tx, actor, {
        type: answered ? "reply-posted" : "comment-posted",
        task,
        commentId: created.id,
        now: input.now,
      });
      return created;
    });

    await notifications.notify(
      actor,
      answered
        ? { type: "reply-posted", task, commentText: text, answeredAuthorId: answered.userId }
        : { type: "comment-posted", task, commentText: text },
    );
    return { ok: true, comment: { id: comment.id, taskId: task.id, category: task.category } };
  }

  /** The Comment with what rules need to know about it and its Task, or `null`. */
  async function findComment(commentId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        taskId: true,
        userId: true,
        parentId: true,
        isPinned: true,
        text: true,
        task: { select: { id: true, title: true, category: true, userId: true } },
      },
    });
    if (!comment) return null;
    const ref = { id: comment.id, taskId: comment.taskId, category: comment.task.category };
    return { ...comment, ref };
  }

  /** Changes a Comment's text and marks it edited at `now`. Only its author may edit it. */
  async function edit(
    actor: Actor,
    input: { commentId: string; text: string; now: Date },
  ): Promise<CommentResult> {
    const comment = await findComment(input.commentId);
    if (!comment) return { ok: false, error: COMMENT_NOT_FOUND };
    if (comment.userId !== actor.id) return { ok: false, error: ONLY_THE_AUTHOR_EDITS };

    const text = input.text.trim();
    if (!text) return { ok: false, error: EMPTY_TEXT };

    await prisma.comment.update({
      where: { id: comment.id },
      data: { text, editedAt: input.now },
    });
    return { ok: true, comment: comment.ref };
  }

  /**
   * Deletes a Comment with its Reactions. Deleting a top-level Comment also
   * deletes its Replies. Replies that answered a deleted Reply answer the
   * thread's top-level Comment instead. Only its author may delete it.
   */
  async function remove(actor: Actor, commentId: string): Promise<CommentResult> {
    const comment = await findComment(commentId);
    if (!comment) return { ok: false, error: COMMENT_NOT_FOUND };
    if (comment.userId !== actor.id) return { ok: false, error: ONLY_THE_AUTHOR_DELETES };

    // Threads are one level deep, so a top-level Comment's Replies have no
    // Replies of their own, and every Reply answering one of them goes too.
    const clearThread = comment.parentId
      ? prisma.comment.updateMany({
          where: { answersId: comment.id },
          data: { answersId: comment.parentId },
        })
      : prisma.comment.deleteMany({ where: { parentId: comment.id } });
    await prisma.$transaction([clearThread, prisma.comment.delete({ where: { id: comment.id } })]);
    return { ok: true, comment: comment.ref };
  }

  /**
   * Adds the Actor's Reaction with `emoji` to a Comment, or removes it if
   * the Actor already reacted with it. Only adding a Reaction is announced.
   */
  async function react(
    actor: Actor,
    input: { commentId: string; emoji: string },
  ): Promise<CommentResult> {
    if (!REACTION_EMOJIS.includes(input.emoji)) return { ok: false, error: EMOJI_NOT_OFFERED };

    const comment = await findComment(input.commentId);
    if (!comment) return { ok: false, error: COMMENT_NOT_FOUND };

    const key = { commentId: comment.id, userId: actor.id, emoji: input.emoji };
    const existing = await prisma.reaction.findUnique({ where: { commentId_userId_emoji: key } });
    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({ data: key });
      await notifications.notify(actor, {
        type: "reaction-added",
        task: comment.task,
        commentText: comment.text,
        emoji: input.emoji,
        commentAuthorId: comment.userId,
      });
    }
    return { ok: true, comment: comment.ref };
  }

  /**
   * Pins a top-level Comment so it heads its Task's discussion, unpinning
   * any other; pinning the Pinned Comment again unpins it. Only the Task
   * Owner may pin, and never a Reply.
   */
  async function pin(actor: Actor, commentId: string): Promise<CommentResult> {
    const comment = await findComment(commentId);
    if (!comment) return { ok: false, error: COMMENT_NOT_FOUND };
    if (comment.task.userId !== actor.id) return { ok: false, error: ONLY_THE_OWNER_PINS };
    if (comment.parentId) return { ok: false, error: REPLIES_ARE_NOT_PINNED };

    await prisma.$transaction(async (tx) => {
      if (comment.isPinned) {
        await tx.comment.update({ where: { id: comment.id }, data: { isPinned: false } });
        return;
      }
      // SQL Server can't express "one pinned Comment per Task" as a filtered
      // unique index here, so the invariant is kept by unpinning first.
      await tx.comment.updateMany({
        where: { taskId: comment.taskId, isPinned: true },
        data: { isPinned: false },
      });
      await tx.comment.update({ where: { id: comment.id }, data: { isPinned: true } });
    });
    return { ok: true, comment: comment.ref };
  }

  /** A Task's Comments and Replies, oldest first, with authors' names and Profile picture addresses, and Reactions. */
  async function list(actor: Actor, taskId: string) {
    return prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true, image: true } },
        reactions: { include: { user: { select: { name: true } } } },
      },
    });
  }

  return { post, edit, delete: remove, pin, react, list };
}

export const comments = createComments({ notifications: defaultNotifications });
