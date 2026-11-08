import z from "zod";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { recordActivity, recordTaskDeleted, recordTaskEdited } from "@/lib/activity";
import { isCategory } from "@/lib/categories";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import { changeTaskFiles, TaskFilesRefused } from "@/lib/files";
import {
  notifications as defaultNotifications,
  type Notifications,
} from "@/lib/notifications";
import type { TaskFormState } from "@/lib/types";

/** Errors to show next to the Task form's fields, or above the whole form. */
export type TaskErrors = NonNullable<TaskFormState["errors"]>;

/** The outcome of a Task rule: the Task it applied to, or why it was refused. */
export type TaskResult =
  | { ok: true; task: { id: string; category: string } }
  | { ok: false; errors: TaskErrors };

export type TaskDeps = {
  notifications: Pick<Notifications, "notify">;
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
 * Why a save failed: a refused file change becomes the form's file error;
 * anything else is logged under `logLabel` and shown as a generic error.
 */
function saveFailure(error: unknown, logLabel: string): TaskResult {
  if (error instanceof TaskFilesRefused) return { ok: false, errors: { files: [error.message] } };
  console.error(logLabel, error);
  return { ok: false, errors: { form: SAVE_FAILED } };
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
   * The Task, if it exists and the Actor is its Task Owner; otherwise the
   * refusal, with `notOwner` as the message for someone else's Task.
   */
  async function findOwnTask(actor: Actor, taskId: string, notOwner: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, category: true, userId: true },
    });
    if (!task) return { ok: false as const, errors: { form: TASK_NOT_FOUND } };
    if (task.userId !== actor.id) return { ok: false as const, errors: { form: notOwner } };
    return { ok: true as const, task };
  }

  /**
   * Posts a Task into a Category. `fileIds` are files the Actor uploaded
   * through the Files module that aren't on any Task yet.
   */
  async function create(
    actor: Actor,
    input: { title: string; description: string; category: string; fileIds: string[]; now: Date },
  ): Promise<TaskResult> {
    if (!isCategory(input.category)) return { ok: false, errors: { form: NOT_A_CATEGORY } };

    const text = taskTextSchema.safeParse(input);
    if (!text.success) return { ok: false, errors: z.flattenError(text.error).fieldErrors };

    let task;
    try {
      task = await prisma.$transaction(async (tx) => {
        const created = await tx.task.create({
          data: {
            title: text.data.title,
            description: text.data.description,
            category: input.category,
            createdAt: input.now,
            updatedAt: input.now,
            user: { connect: { id: actor.id } },
          },
          select: { id: true, title: true, category: true },
        });
        await changeTaskFiles(tx, actor, { taskId: created.id, addedFileIds: input.fileIds });
        await recordActivity(tx, actor, { type: "task-created", task: created, now: input.now });
        return created;
      });
    } catch (error) {
      return saveFailure(error, "Task create failed:");
    }

    await notifications.notify(actor, { type: "task-created", task: { ...task, userId: actor.id } });
    return { ok: true, task: { id: task.id, category: task.category } };
  }

  /**
   * Changes a Task's title and description, removes some of its files and
   * attaches the Actor's newly uploaded ones. Only the Task Owner may edit
   * a Task. A refused file change leaves the whole Task unchanged.
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

    let saved;
    try {
      saved = await prisma.$transaction(async (tx) => {
        await changeTaskFiles(tx, actor, {
          taskId: input.taskId,
          addedFileIds: input.addedFileIds,
          removedFileIds: input.removedFileIds,
        });
        const edited = await tx.task.update({
          where: { id: input.taskId },
          data: {
            title: text.data.title,
            description: text.data.description,
            updatedAt: input.now,
          },
          select: { id: true, title: true, category: true },
        });
        const { merged } = await recordTaskEdited(tx, actor, { task: edited, now: input.now });
        return { task: edited, merged };
      });
    } catch (error) {
      return saveFailure(error, "Task edit failed:");
    }

    const { task, merged } = saved;
    if (!merged) {
      await notifications.notify(actor, { type: "task-edited", task: { ...task, userId: actor.id } });
    }
    return { ok: true, task: { id: task.id, category: task.category } };
  }

  /**
   * Deletes a Task with its files and Comments. Its Task Activities stay in
   * the Feed under its last title. Only the Task Owner may delete a Task.
   */
  async function remove(
    actor: Actor,
    { taskId, now }: { taskId: string; now: Date },
  ): Promise<TaskResult> {
    const owned = await findOwnTask(actor, taskId, ONLY_THE_OWNER_DELETES);
    if (!owned.ok) return owned;

    await prisma.$transaction(async (tx) => {
      const deleted = await tx.task.delete({
        where: { id: taskId },
        select: { id: true, title: true, category: true },
      });
      await recordTaskDeleted(tx, actor, { task: deleted, now });
    });

    const { id, category } = owned.task;
    await notifications.notify(actor, { type: "task-deleted", task: owned.task });
    return { ok: true, task: { id, category } };
  }

  /**
   * Marks a Task Done or not Done. Any user may do this, not only the Task
   * Owner, who is told when someone else does. Marking a Task with the
   * status it already has changes nothing.
   */
  async function setDone(
    actor: Actor,
    { taskId, isDone, now }: { taskId: string; isDone: boolean; now: Date },
  ): Promise<TaskResult> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, category: true, userId: true, isDone: true },
    });
    if (!task) return { ok: false, errors: { form: TASK_NOT_FOUND } };

    const result = { ok: true as const, task: { id: task.id, category: task.category } };
    if (task.isDone === isDone) return result;

    const type = isDone ? "task-done" : "task-not-done";
    await prisma.$transaction(async (tx) => {
      await tx.task.update({ where: { id: taskId }, data: { isDone, updatedAt: now } });
      await recordActivity(tx, actor, { type, task, now });
    });
    await notifications.notify(actor, { type, task });
    return result;
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

  /**
   * How many Tasks in each Category aren't Done yet, by Category slug. A
   * Category with none is left out. Every signed-in user sees every Task,
   * so the Actor doesn't narrow the counts.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- modules always take the Actor
  async function notDoneCounts(actor: Actor): Promise<Record<string, number>> {
    const groups = await prisma.task.groupBy({
      by: ["category"],
      where: { isDone: false },
      _count: { _all: true },
    });
    return Object.fromEntries(groups.map((group) => [group.category, group._count._all]));
  }

  return { create, edit, delete: remove, setDone, get, list, notDoneCounts };
}

export const tasks = createTasks({ notifications: defaultNotifications });
