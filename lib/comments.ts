import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { REACTION_EMOJIS } from "@/lib/constants";
import { notifyComment, type createNotifications } from "@/lib/notifications";
import type { CommentInteractionType } from "@/lib/types";

/** The Comment a rule applied to, with its Task's id and Category for refreshing pages. */
export type CommentResult =
  | { ok: true; comment: { id: string; taskId: string; category: string } }
  | { ok: false; error: string };

export type CommentDeps = {
  notifications: Pick<ReturnType<typeof createNotifications>, "notifyComment">;
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
   * Emails about a Comment, Reply or Reaction. Sending already logs its own
   * failures; this also keeps a failed recipient lookup from failing a saved change.
   */
  async function announce(
    actor: Actor,
    type: CommentInteractionType,
    task: { title: string; category: string },
  ) {
    try {
      await notifications.notifyComment({
        actorId: actor.id,
        actorName: actor.name,
        taskTitle: task.title,
        category: task.category,
        type,
      });
    } catch (err) {
      console.error("Comment notification failed:", err);
    }
  }

  /**
   * Posts a Comment on a Task, or a Reply when `replyToId` names the Comment
   * being answered. Threads are one level deep: a Reply to a Reply is filed
   * under the thread's top-level Comment.
   */
  async function post(
    actor: Actor,
    input: { taskId: string; text: string; replyToId?: string | null; now: Date },
  ): Promise<CommentResult> {
    const text = input.text.trim();
    if (!text) return { ok: false, error: EMPTY_TEXT };

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, title: true, category: true },
    });
    if (!task) return { ok: false, error: TASK_NOT_FOUND };

    let parentId: string | null = null;
    if (input.replyToId) {
      const answered = await prisma.comment.findUnique({
        where: { id: input.replyToId },
        select: { id: true, taskId: true, parentId: true },
      });
      if (!answered) return { ok: false, error: COMMENT_NOT_FOUND };
      if (answered.taskId !== task.id) return { ok: false, error: REPLY_ON_ANOTHER_TASK };
      parentId = answered.parentId ?? answered.id;
    }

    const comment = await prisma.comment.create({
      data: { text, taskId: task.id, userId: actor.id, parentId, createdAt: input.now },
      select: { id: true },
    });

    await announce(actor, parentId ? "reply" : "comment", task);
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
        task: { select: { title: true, category: true, userId: true } },
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
   * deletes its Replies. Only its author may delete it.
   */
  async function remove(actor: Actor, commentId: string): Promise<CommentResult> {
    const comment = await findComment(commentId);
    if (!comment) return { ok: false, error: COMMENT_NOT_FOUND };
    if (comment.userId !== actor.id) return { ok: false, error: ONLY_THE_AUTHOR_DELETES };

    // Threads are one level deep, so a Comment's Replies have no Replies of their own.
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { parentId: comment.id } }),
      prisma.comment.delete({ where: { id: comment.id } }),
    ]);
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
      await announce(actor, "reaction", comment.task);
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

  /** A Task's Comments and Replies, oldest first, with authors' names and Reactions. */
  async function list(actor: Actor, taskId: string) {
    return prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { name: true } },
        reactions: { include: { user: { select: { name: true } } } },
      },
    });
  }

  return { post, edit, delete: remove, pin, react, list };
}

export const comments = createComments({ notifications: { notifyComment } });
