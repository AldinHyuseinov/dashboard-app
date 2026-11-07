"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/session";
import { comments, type CommentResult } from "@/lib/comments";

/** Refreshes the Task page the Comment is on, or throws the refusal for the UI to undo its change. */
function refreshTaskPageOrThrow(result: CommentResult) {
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/category/${result.comment.category}/${result.comment.taskId}`);
}

/** Posts a Comment, or a Reply when `replyToId` names the Comment being answered. */
export async function createCommentAction({
  taskId,
  text,
  replyToId,
}: {
  taskId: string;
  text: string;
  replyToId?: string | null;
}) {
  const actor = await requireActor();
  refreshTaskPageOrThrow(await comments.post(actor, { taskId, text, replyToId, now: new Date() }));
}

export async function editCommentAction(commentId: string, text: string) {
  const actor = await requireActor();
  refreshTaskPageOrThrow(await comments.edit(actor, { commentId, text, now: new Date() }));
}

export async function deleteCommentAction(commentId: string) {
  const actor = await requireActor();
  refreshTaskPageOrThrow(await comments.delete(actor, commentId));
}

export async function pinCommentAction(commentId: string) {
  const actor = await requireActor();
  refreshTaskPageOrThrow(await comments.pin(actor, commentId));
}

export async function toggleReactionAction(commentId: string, emoji: string) {
  const actor = await requireActor();
  refreshTaskPageOrThrow(await comments.react(actor, { commentId, emoji }));
}
