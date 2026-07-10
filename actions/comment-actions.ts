"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendCommentNotification } from "./action-helpers";

export async function createCommentAction(
  {
    taskId,
    text,
    parentId,
  }: {
    taskId: string;
    text: string;
    parentId?: string | null;
  },
  category: string,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  if (!text || text.trim().length === 0) throw new Error("Коментарът не може да бъде празен.");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { title: true },
  });
  if (!task) throw new Error("Task not found");

  let resolvedParentId = parentId || null;
  if (resolvedParentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: resolvedParentId },
      select: { parentId: true },
    });
    if (parent?.parentId) {
      resolvedParentId = parent.parentId;
    }
  }

  await prisma.comment.create({
    data: {
      text: text.trim(),
      taskId,
      userId: session.user.id,
      parentId: resolvedParentId,
    },
  });

  revalidatePath(`/category/${category}`);

  void sendCommentNotification({
    actorId: session.user.id,
    actorName: session.user.name ?? "Потребител",
    taskTitle: task.title,
    category,
    type: resolvedParentId ? "reply" : "comment",
  });
}

export async function editCommentAction(commentId: string, text: string, category: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  if (!text || text.trim().length === 0) throw new Error("Коментарът не може да бъде празен.");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== session.user.id) throw new Error("Unauthorized");

  await prisma.comment.update({
    where: { id: commentId },
    data: {
      text: text.trim(),
      editedAt: new Date(),
    },
  });

  revalidatePath(`/category/${category}`);
  // No notification email for edits — matches YouTube (editing doesn't renotify).
}

export async function pinCommentAction(commentId: string, taskId: string, category: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { userId: true },
  });
  if (!task) throw new Error("Task not found");

  // Only the task owner can pin, mirroring YouTube's "channel owner pins
  // comments on their video" model.
  if (task.userId !== session.user.id) throw new Error("Unauthorized");

  const target = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { isPinned: true, taskId: true },
  });
  if (!target || target.taskId !== taskId) throw new Error("Comment not found");

  await prisma.$transaction(async (tx) => {
    if (target.isPinned) {
      // Toggling the same comment off — just unpin it.
      await tx.comment.update({ where: { id: commentId }, data: { isPinned: false } });
      return;
    }

    // Only one pinned comment per task at a time — unpin any existing one
    // first (SQL Server doesn't cleanly support a filtered unique index for
    // this, so the invariant is enforced here instead).
    await tx.comment.updateMany({
      where: { taskId, isPinned: true },
      data: { isPinned: false },
    });
    await tx.comment.update({ where: { id: commentId }, data: { isPinned: true } });
  });

  revalidatePath(`/category/${category}`);
}

export async function toggleReactionAction(commentId: string, emoji: string, category: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  const existing = await prisma.reaction.findUnique({
    where: {
      commentId_userId_emoji: {
        commentId,
        userId: session.user.id,
        emoji,
      },
    },
  });

  let didAdd = false;

  if (existing) {
    // If they clicked it again, remove it (Toggle Off)
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    // Save new reaction (Toggle On)
    await prisma.reaction.create({
      data: {
        emoji,
        commentId,
        userId: session.user.id,
      },
    });
    didAdd = true;
  }

  revalidatePath(`/category/${category}`);

  // Only notify on adding a reaction, not on removing one
  if (didAdd) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { task: { select: { title: true } } },
    });

    if (comment) {
      void sendCommentNotification({
        actorId: session.user.id,
        actorName: session.user.name ?? "Потребител",
        taskTitle: comment.task.title,
        category,
        type: "reaction",
      });
    }
  }
}

export async function deleteCommentAction(commentId: string, category: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== session.user.id) throw new Error("Unauthorized");

  // With flat single-level threading, a comment can only ever have direct
  // replies (never grandchildren), so no recursive walk is needed anymore —
  // just delete any direct replies first, then the comment itself.
  await prisma.comment.deleteMany({ where: { parentId: commentId } });
  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath(`/category/${category}`);
}
