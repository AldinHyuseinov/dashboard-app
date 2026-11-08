"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import { taskHref } from "@/lib/navigation";
import type { TaskFormState } from "@/lib/types";

const boardPath = (category: string) => `/category/${category}`;

/**
 * Saves the New or Edit task form. Its files were already uploaded through
 * /api/upload, one at a time. A new Task is reported back, for the form to
 * show it was published; an edited one returns to its Task screen.
 */
export async function submitTaskAction(
  prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requireActor();

  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const category = String(formData.get("category") ?? "");
  const taskId = formData.get("taskId");
  const addedFileIds = formData.getAll("processedFileIds").map(String);
  const removedFileIds = formData.getAll("deletedFileIds").map(String);
  const now = new Date();

  const isEdit = typeof taskId === "string" && taskId !== "";
  const result = isEdit
    ? await tasks.edit(actor, { taskId, title, description, addedFileIds, removedFileIds, now })
    : await tasks.create(actor, { title, description, category, fileIds: addedFileIds, now });

  if (!result.ok) return { errors: result.errors };

  revalidatePath(boardPath(result.task.category));
  if (isEdit) {
    revalidatePath(taskHref(result.task));
    redirect(`${taskHref(result.task)}?updated=true`);
  }
  return { published: { href: taskHref(result.task), title: title.trim() } };
}

export async function deleteTask(taskId: string) {
  const actor = await requireActor();

  const result = await tasks.delete(actor, { taskId, now: new Date() });
  if (!result.ok) throw new Error(result.errors.form);

  revalidatePath(boardPath(result.task.category));
  redirect(`${boardPath(result.task.category)}?deleted=true`);
}

export async function toggleTaskStatus(taskId: string, isDone: boolean) {
  const actor = await requireActor();

  const result = await tasks.setDone(actor, { taskId, isDone, now: new Date() });
  if (!result.ok) throw new Error(result.errors.form);

  revalidatePath(boardPath(result.task.category));
  revalidatePath(taskHref(result.task));
}
