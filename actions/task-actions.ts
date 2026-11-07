"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActor } from "@/lib/session";
import { tasks } from "@/lib/tasks";
import type { TaskFormState } from "@/lib/types";

const boardPath = (category: string) => `/category/${category}`;

export async function submitTaskAction(
  prevState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const actor = await requireActor();

  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const category = String(formData.get("category") ?? "");
  const taskId = formData.get("taskId");
  // Files already uploaded through /api/upload by the form, one at a time.
  const addedFileIds = formData.getAll("processedFileIds").map(String);
  const removedFileIds = formData.getAll("deletedFileIds").map(String);
  const now = new Date();

  const isEdit = typeof taskId === "string" && taskId !== "";
  const result = isEdit
    ? await tasks.edit(actor, { taskId, title, description, addedFileIds, removedFileIds, now })
    : await tasks.create(actor, { title, description, category, fileIds: addedFileIds, now });

  if (!result.ok) return { errors: result.errors, inputs: { title, description } };

  revalidatePath(boardPath(result.task.category));
  redirect(`${boardPath(result.task.category)}?${isEdit ? "updated" : "success"}=true`);
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
}
