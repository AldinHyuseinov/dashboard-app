"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ProcessFilesResult, TaskFormState, taskSchema } from "@/lib/types";
import { Prisma } from "@/generated/prisma/client";
import z from "zod";
import { processAndCompressFiles } from "./action-helpers";
import { MAX_FILE_SIZE, MAX_FILES } from "@/lib/constants";

async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user;
}

export async function submitTaskAction(
  prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  // Extract text fields
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;

  const inputs = { title, description };

  const validatedFields = taskSchema.safeParse({ title, description, category });

  if (!validatedFields.success) {
    const errors = z.flattenError(validatedFields.error).fieldErrors as TaskFormState["errors"];
    console.log("Task validation errors:", errors);

    return { errors: errors, inputs };
  }

  const rawFiles = formData.getAll("files") as File[];
  let fileResult: ProcessFilesResult = { errors: undefined, processedFiles: undefined };

  if (rawFiles.length > 0) {
    fileResult = await processAndCompressFiles(rawFiles, MAX_FILE_SIZE, MAX_FILES);

    // If there are file validation errors, return them immediately
    if (fileResult.errors) {
      return { errors: fileResult.errors, inputs };
    }
  }

  const processedFiles = fileResult?.processedFiles || [];
  const taskId = formData.get("taskId") as string | null;
  const deletedFileIds = formData.getAll("deletedFileIds") as string[];

  let currentFileCount = 0;

  if (taskId) {
    currentFileCount = await prisma.taskFile.count({
      where: { taskId: taskId },
    });

    currentFileCount = currentFileCount - deletedFileIds.length;
  }

  const remainingSlots = MAX_FILES - currentFileCount;

  // Enforce the total limit securely on the server
  if (processedFiles.length > remainingSlots) {
    return {
      errors: {
        files: [
          currentFileCount > 0
            ? `Тази задача вече има ${currentFileCount} файла. Можете да добавите максимум още ${remainingSlots}.`
            : `Можете да прикачите максимум ${MAX_FILES} файла.`,
        ],
      },
      inputs,
    };
  }

  // Save to Database
  try {
    if (taskId) {
      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: { userId: true },
      });

      if (!existingTask || existingTask.userId !== user.id) {
        return { errors: { form: "Неупълномощен достъп." } };
      }

      if (deletedFileIds.length > 0) {
        await prisma.taskFile.deleteMany({
          where: {
            taskId: taskId,
            id: { in: deletedFileIds },
          },
        });
      }

      const updateData: Prisma.TaskUpdateInput = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
      };

      if (processedFiles.length > 0) {
        updateData.files = {
          create: processedFiles,
        };
      }

      await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });
    } else {
      const createData: Prisma.TaskCreateInput = {
        title: validatedFields.data.title,
        description: validatedFields.data.description,
        category: validatedFields.data.category,
        userId: user.id,
      };

      if (processedFiles.length > 0) {
        createData.files = {
          create: processedFiles,
        };
      }

      await prisma.task.create({
        data: createData,
      });
    }
  } catch (error) {
    console.error("Database save error:", error);
    return { errors: { form: "Възникна грешка при запазване." }, inputs };
  }

  revalidatePath(`/${category}`);

  return { success: true };
}

export async function updateTask(taskId: string, formData: FormData, category: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task?.userId !== user.id) throw new Error("You can only edit your own tasks");

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
    },
  });

  revalidatePath(`/${category}`);
}

export async function deleteTask(taskId: string, category: string) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (task?.userId !== user.id) throw new Error("You can only delete your own tasks");

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/${category}`);
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
