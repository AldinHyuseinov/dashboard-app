"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendCommentNotification } from "./action-helpers";

export async function createCommentAction(formData: FormData, category: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const text = formData.get("text") as string;

  if (!text || text.trim().length === 0) {
    throw new Error("Коментарът не може да бъде празен.");
  }

  // 1. Create the comment and simultaneously include the Task Title
  const newComment = await prisma.comment.create({
    data: {
      text: text.trim(),
      taskId,
      userId: session.user.id,
    },
    include: {
      task: {
        select: { title: true },
      },
    },
  });

  // 2. Trigger the notification in the background
  void sendCommentNotification({
    actorId: session.user.id,
    actorName: session.user.name || "Потребител",
    taskTitle: newComment.task.title,
    category,
  });

  revalidatePath(`/category/${category}`);
}
