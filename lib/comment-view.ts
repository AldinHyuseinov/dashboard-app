/**
 * How a Task's Comments are shown: threads in the chosen order, what the
 * viewer may do with each Comment, whom a Reply answers, and Reaction chips.
 * The rules themselves live in the Comments module; this mirrors them so the
 * screen only offers what the server will accept.
 */

import type { Comment, CommentThreadData, SortMode } from "@/lib/types";
import { firstName } from "@/lib/utils";

const time = (comment: Comment) => new Date(comment.createdAt).getTime();
const reactionCount = (comment: Comment) => (comment.reactions ?? []).length;

/**
 * Top-level Comments, each with its Replies oldest first. The Pinned Comment
 * leads; then "top" ranks by Reaction count, newest first on a tie, and
 * "newest" is newest first. Threads are one level deep.
 */
export function commentThreads(comments: readonly Comment[], sort: SortMode): CommentThreadData[] {
  const repliesByThread = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (!comment.parentId) continue;
    const replies = repliesByThread.get(comment.parentId) ?? [];
    replies.push(comment);
    repliesByThread.set(comment.parentId, replies);
  }

  return comments
    .filter((comment) => !comment.parentId)
    .map((topLevel) => ({
      topLevel,
      replies: (repliesByThread.get(topLevel.id) ?? []).sort((a, b) => time(a) - time(b)),
    }))
    .sort(({ topLevel: a }, { topLevel: b }) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      if (sort === "top") {
        const byReactions = reactionCount(b) - reactionCount(a);
        if (byReactions !== 0) return byReactions;
      }
      return time(b) - time(a);
    });
}

/** Who wrote the Comment, by name; every Comment needs one to show. */
export const authorName = (comment: Comment) => comment.user?.name || "Потребител";

export type CommentActions = {
  canReact: boolean;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
};

const UNSAVED = "unsaved-";
let unsavedCount = 0;

/** An id for a Comment or Reaction shown before the server has saved it. */
export const unsavedId = () => `${UNSAVED}${Date.now()}-${++unsavedCount}`;

/** Whether the Comment is only on screen so far: nothing can refer to it yet. */
export const isUnsaved = (comment: Comment) => comment.id.startsWith(UNSAVED);

/**
 * What the viewer may do with a Comment: anyone reacts and replies; only the
 * author edits and deletes; only the Task Owner pins, and only top-level
 * Comments. A Comment that isn't saved yet offers nothing.
 */
export function commentActions(
  comment: Comment,
  { viewerId, isTaskOwner }: { viewerId: string; isTaskOwner: boolean },
): CommentActions {
  if (isUnsaved(comment)) {
    return { canReact: false, canReply: false, canEdit: false, canDelete: false, canPin: false };
  }
  const isAuthor = comment.userId === viewerId;
  return {
    canReact: true,
    canReply: true,
    canEdit: isAuthor,
    canDelete: isAuthor,
    canPin: isTaskOwner && !comment.parentId,
  };
}

/**
 * Whom a Reply answers, as "@FirstName" shown before its text: the author of
 * the Comment it records answering, or of its top-level Comment when that
 * one is gone. Replies once carried the "@Name" in their text, so a text
 * starting with the same mention drops it rather than show it twice. `null`
 * for a top-level Comment.
 */
export function replyMention(
  reply: Comment,
  comments: readonly Comment[],
): { mention: string; text: string } | null {
  if (!reply.parentId) return null;
  const answered =
    comments.find((c) => c.id === reply.answersId) ?? comments.find((c) => c.id === reply.parentId);
  if (!answered) return null;

  const mention = `@${firstName(authorName(answered))}`;
  const repeated = reply.text.startsWith(mention) && /^\s|^$/.test(reply.text.slice(mention.length));
  return { mention, text: repeated ? reply.text.slice(mention.length).trimStart() : reply.text };
}

export type ReactionChip = { emoji: string; count: number; mine: boolean };

/** Each emoji on a Comment with how many reacted with it and whether the viewer did, in first-seen order. */
export function reactionChips(comment: Comment, viewerId: string): ReactionChip[] {
  const chips = new Map<string, ReactionChip>();
  for (const { emoji, userId } of comment.reactions ?? []) {
    const chip = chips.get(emoji) ?? { emoji, count: 0, mine: false };
    chip.count += 1;
    chip.mine ||= userId === viewerId;
    chips.set(emoji, chip);
  }
  return [...chips.values()];
}
