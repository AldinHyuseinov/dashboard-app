"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { TaskFormState, taskSchema } from "@/lib/types";
import { Prisma } from "@/generated/prisma/client";
import z from "zod";
import { MAX_FILES } from "@/lib/constants";
import { redirect } from "next/navigation";

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user;
}

export async function submitTaskAction(
  prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) throw new Error("Unauthorized");

  // 1. Extract fields
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const taskId = formData.get("taskId") as string | null;

  // 2. Extract IDs of files pre-processed by the API route
  // These were appended to formData by the client-side loop
  const processedFileIds = formData.getAll("processedFileIds") as string[];
  const deletedFileIds = formData.getAll("deletedFileIds") as string[];

  const inputs = { title, description };

  // 3. Text Validation
  const validatedFields = taskSchema.safeParse({ title, description, category });
  if (!validatedFields.success) {
    const errors = z.flattenError(validatedFields.error).fieldErrors as TaskFormState["errors"];
    return { errors, inputs };
  }

  // 4. Capacity and Limit Logic
  let currentDbCount = 0;
  if (taskId) {
    currentDbCount = await prisma.taskFile.count({
      where: { taskId: taskId },
    });
  }

  // Final count = (Existing in DB - To be deleted) + Newly uploaded via API
  const totalCountAfterAction = currentDbCount - deletedFileIds.length + processedFileIds.length;

  if (totalCountAfterAction > MAX_FILES) {
    const remainingSlots = MAX_FILES - (currentDbCount - deletedFileIds.length);
    return {
      errors: {
        files: [
          currentDbCount > 0
            ? `Тази задача вече има ${currentDbCount - deletedFileIds.length} запазени файла. Можете да добавите максимум още ${remainingSlots}.`
            : `Можете да прикачите максимум ${MAX_FILES} файла.`,
        ],
      },
      inputs,
    };
  }

  const isUpdate = Boolean(taskId);

  // 5. Database Save Logic
  try {
    if (isUpdate && taskId) {
      // --- UPDATE LOGIC ---
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { userId: true },
      });

      if (!existingTask || existingTask.userId !== user.id) {
        return { errors: { form: "Неупълномощен достъп." }, inputs };
      }

      // Build update data
      const updateData: Prisma.TaskUpdateInput = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        files: {
          // Remove old ones
          deleteMany: deletedFileIds.length > 0 ? { id: { in: deletedFileIds } } : undefined,
          // Link the newly processed orphaned files
          connect: processedFileIds.map((id) => ({ id })),
        },
      };

      await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });
    } else {
      // --- CREATE LOGIC ---
      const createData: Prisma.TaskCreateInput = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        category: validatedFields.data.category,
        user: { connect: { id: user.id } },
        files: {
          // Link the processed orphaned files
          connect: processedFileIds.map((id) => ({ id })),
        },
      };

      await prisma.task.create({
        data: createData,
      });
    }
  } catch (error) {
    console.error("Database save error:", error);
    return { errors: { form: "Възникна грешка при запазване." }, inputs };
  }

  if (isUpdate) {
    redirect(`/category/${category}?updated=true`);
  } else {
    redirect(`/category/${category}?success=true`);
  }
}

export async function deleteTask(taskId: string, category: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task?.userId !== user.id) throw new Error("You can only delete your own tasks");

  await prisma.task.delete({ where: { id: taskId } });
  redirect(`/category/${category}?deleted=true`);
}

export async function toggleTaskStatus(taskId: string, isDone: boolean, category: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized"); // Any user can do this

  await prisma.task.update({
    where: { id: taskId },
    data: { isDone },
  });

  revalidatePath(`/${category}`);
}
