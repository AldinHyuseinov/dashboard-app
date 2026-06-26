"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createCommentAction(formData: FormData, category: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");

  const taskId = formData.get("taskId") as string;
  const text = formData.get("text") as string;

  if (!text || text.trim().length === 0) {
    throw new Error("Коментарът не може да бъде празен.");
  }

  await prisma.comment.create({
    data: {
      text: text.trim(),
      taskId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/category/${category}`);
}
