import z from "zod";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { isCategory } from "@/lib/categories";
import { ITEMS_PER_PAGE, MAX_FILES } from "@/lib/constants";
import { notifyTaskChange, type createNotifications } from "@/lib/notifications";
import type { TaskFormState } from "@/lib/types";

/** Errors to show next to the Task form's fields, or above the whole form. */
export type TaskErrors = NonNullable<TaskFormState["errors"]>;

/** The outcome of a Task rule: the Task it applied to, or why it was refused. */
export type TaskResult =
  | { ok: true; task: { id: string; category: string } }
  | { ok: false; errors: TaskErrors };

export type TaskDeps = {
  notifications: Pick<ReturnType<typeof createNotifications>, "notifyTaskChange">;
};

const taskTextSchema = z.object({
  title: z.string().min(1, "Заглавието е задължително."),
  description: z.string().min(1, "Описанието е задължително."),
});

const NOT_A_CATEGORY = "Задачи могат да се публикуват само в съществуваща категория.";
const ONLY_THE_OWNER_EDITS = "Неупълномощен достъп.";
const ONLY_THE_OWNER_DELETES = "Само собственикът на задачата може да я изтрие.";
const TASK_NOT_FOUND = "Задачата не е намерена.";
const SAVE_FAILED = "Възникна грешка при запазване.";

/**
 * The 10-files-per-Task limit: files already on the Task, minus those being
 * removed, plus those being added. Returns the error to show, if any.
 */
function fileLimitError(existing: number, removed: number, added: number): string | undefined {
  const kept = existing - removed;
  if (kept + added <= MAX_FILES) return undefined;
  return existing > 0
    ? `Тази задача вече има ${kept} запазени файла. Можете да добавите максимум още ${MAX_FILES - kept}.`
    : `Можете да прикачите максимум ${MAX_FILES} файла.`;
}

const TASK_DETAILS = {
  files: { select: { id: true, fileName: true, fileType: true } },
  user: { select: { name: true } },
} as const;

/**
 * Builds the Tasks module around its collaborators. Production code uses
 * the default instance exported below; tests inject in-memory adapters.
 */
export function createTasks({ notifications }: TaskDeps) {
  /**
   * Emails everyone but the Actor. Sending already logs its own failures;
   * this also keeps a failed recipient lookup from failing a saved change.
   */
  async function announce(actor: Actor, action: string, category: string) {
    try {
      await notifications.notifyTaskChange({ actorId: actor.id, action, category });
    } catch (err) {
      console.error("Task notification failed:", err);
    }
  }

  /**
   * The Task, if it exists and the Actor is its Task Owner; otherwise the
   * refusal, with `notOwner` as the message for someone else's Task.
   */
  async function findOwnTask(actor: Actor, taskId: string, notOwner: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, category: true, userId: true, _count: { select: { files: true } } },
    });
    if (!task) return { ok: false as const, errors: { form: TASK_NOT_FOUND } };
    if (task.userId !== actor.id) return { ok: false as const, errors: { form: notOwner } };
    return { ok: true as const, task };
  }

  /**
   * Posts a Task into a Category. `fileIds` are files already uploaded
   * through the upload route.
   */
  async function create(
    actor: Actor,
    input: { title: string; description: string; category: string; fileIds: string[]; now: Date },
  ): Promise<TaskResult> {
    if (!isCategory(input.category)) return { ok: false, errors: { form: NOT_A_CATEGORY } };

    const text = taskTextSchema.safeParse(input);
    if (!text.success) return { ok: false, errors: z.flattenError(text.error).fieldErrors };

    const tooManyFiles = fileLimitError(0, 0, input.fileIds.length);
    if (tooManyFiles) return { ok: false, errors: { files: [tooManyFiles] } };

    let task;
    try {
      task = await prisma.task.create({
        data: {
          title: text.data.title,
          description: text.data.description,
          category: input.category,
          createdAt: input.now,
          updatedAt: input.now,
          user: { connect: { id: actor.id } },
          files: { connect: input.fileIds.map((id) => ({ id })) },
        },
        select: { id: true, category: true },
      });
    } catch (error) {
      console.error("Task create failed:", error);
      return { ok: false, errors: { form: SAVE_FAILED } };
    }

    await announce(actor, "Създадена нова", task.category);
    return { ok: true, task };
  }

  /**
   * Changes a Task's title and description, attaches newly uploaded files
   * and removes some of its files. Only the Task Owner may edit a Task.
   */
  async function edit(
    actor: Actor,
    input: {
      taskId: string;
      title: string;
      description: string;
      addedFileIds: string[];
      removedFileIds: string[];
      now: Date;
    },
  ): Promise<TaskResult> {
    const owned = await findOwnTask(actor, input.taskId, ONLY_THE_OWNER_EDITS);
    if (!owned.ok) return owned;

    const text = taskTextSchema.safeParse(input);
    if (!text.success) return { ok: false, errors: z.flattenError(text.error).fieldErrors };

    const tooManyFiles = fileLimitError(
      owned.task._count.files,
      input.removedFileIds.length,
      input.addedFileIds.length,
    );
    if (tooManyFiles) return { ok: false, errors: { files: [tooManyFiles] } };

    let task;
    try {
      task = await prisma.task.update({
        where: { id: input.taskId },
        data: {
          title: text.data.title,
          description: text.data.description,
          updatedAt: input.now,
          files: {
            deleteMany:
              input.removedFileIds.length > 0 ? { id: { in: input.removedFileIds } } : undefined,
            connect: input.addedFileIds.map((id) => ({ id })),
          },
        },
        select: { id: true, category: true },
      });
    } catch (error) {
      console.error("Task edit failed:", error);
      return { ok: false, errors: { form: SAVE_FAILED } };
    }

    await announce(actor, "Обновена", task.category);
    return { ok: true, task };
  }

  /** Deletes a Task with its files and Comments. Only the Task Owner may delete a Task. */
  async function remove(
    actor: Actor,
    taskId: string,
  ): Promise<TaskResult> {
    const owned = await findOwnTask(actor, taskId, ONLY_THE_OWNER_DELETES);
    if (!owned.ok) return owned;

    await prisma.task.delete({ where: { id: taskId } });

    const { id, category } = owned.task;
    await announce(actor, "Изтрита", category);
    return { ok: true, task: { id, category } };
  }

  /** Marks a Task Done or not Done. Any user may do this, not only the Task Owner. */
  async function setDone(
    actor: Actor,
    { taskId, isDone, now }: { taskId: string; isDone: boolean; now: Date },
  ): Promise<TaskResult> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, category: true },
    });
    if (!task) return { ok: false, errors: { form: TASK_NOT_FOUND } };

    await prisma.task.update({ where: { id: taskId }, data: { isDone, updatedAt: now } });
    return { ok: true, task };
  }

  /** One Task with its owner's name and its files' metadata, or `null`. */
  async function get(actor: Actor, taskId: string) {
    return prisma.task.findUnique({ where: { id: taskId }, include: TASK_DETAILS });
  }

  /**
   * One page of a Category's Tasks, most recently updated first. A page
   * number below 1 is treated as the first page.
   */
  async function list(actor: Actor, { category, page }: { category: string; page: number }) {
    const currentPage = Math.max(1, Math.floor(page) || 1);
    const [taskPage, total] = await prisma.$transaction([
      prisma.task.findMany({
        where: { category },
        orderBy: { updatedAt: "desc" },
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        include: TASK_DETAILS,
      }),
      prisma.task.count({ where: { category } }),
    ]);
    return { tasks: taskPage, currentPage, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
  }

  return { create, edit, delete: remove, setDone, get, list };
}

export const tasks = createTasks({ notifications: { notifyTaskChange } });
