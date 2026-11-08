import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { createNotifications } from "@/lib/notifications";
import { createTasks } from "@/lib/tasks";
import { activity } from "@/lib/activity";
import type { Actor } from "@/lib/actor";
import { createUser } from "./support/fixtures";

const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");

/** `minutes` (and `seconds`) after 10:00 on Monday. */
function mondayAt10(minutes: number, seconds = 0) {
  return new Date(Date.UTC(2026, 10, 2, 10, minutes, seconds));
}

/**
 * Repeated edits by the same Actor on the same Task within 10 minutes show
 * as one "edited" item at the latest edit time, and notify only once.
 */
describe("Merging repeated edits", () => {
  let emails: InMemoryEmailAdapter;
  let tasks: ReturnType<typeof createTasks>;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    tasks = createTasks({ notifications: createNotifications({ emailAdapter: emails }) });
  });

  /** Posts a Task as `owner`, then forgets the email it sent. */
  async function postTask(
    owner: Actor,
    { title = "Нова винена листа", now = MONDAY_9AM }: { title?: string; now?: Date } = {},
  ) {
    const result = await tasks.create(owner, {
      title,
      description: "Да се обнови до петък",
      category: "golf-clubs",
      fileIds: [],
      now,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    emails.sent.length = 0;
    return result.task;
  }

  /** The Task Owner changes the Task's title at `now`. */
  async function edit(owner: Actor, taskId: string, title: string, now: Date) {
    const result = await tasks.edit(owner, {
      taskId,
      title,
      description: "Да се обнови до петък",
      addedFileIds: [],
      removedFileIds: [],
      now,
    });
    if (!result.ok) throw new Error(`Could not edit the Task: ${JSON.stringify(result.errors)}`);
  }

  /** The Feed as [type, Actor, time, title] rows, newest first. */
  async function feedRows(viewer: Actor) {
    const feed = await activity.feed(viewer, {});
    return feed.items.map((item) => [item.type, item.actor.name, item.occurredAt, item.task.title]);
  }

  it("when Ivan edits his Task again within 10 minutes, the Feed shows one edit at the later time, and everyone is notified once", async () => {
    const ivan = await createUser("Ivan");
    const maria = await createUser("Maria");
    const task = await postTask(ivan);

    await edit(ivan, task.id, "Винена листа", mondayAt10(0));
    await edit(ivan, task.id, "Винена листа 2027", mondayAt10(6));

    expect(await feedRows(maria)).toEqual([
      ["task-edited", "Ivan", mondayAt10(6), "Винена листа 2027"],
      ["task-created", "Ivan", MONDAY_9AM, "Винена листа 2027"],
    ]);
    expect(emails.sent).toHaveLength(1);
    expect(emails.sent[0].to).toEqual(["maria@avexim.test"]);
  });

  it("an edit exactly 10 minutes after the last one is still merged", async () => {
    const ivan = await createUser("Ivan");
    await createUser("Maria");
    const task = await postTask(ivan);

    await edit(ivan, task.id, "Винена листа", mondayAt10(0));
    await edit(ivan, task.id, "Винена листа 2027", mondayAt10(10));

    expect(await feedRows(ivan)).toEqual([
      ["task-edited", "Ivan", mondayAt10(10), "Винена листа 2027"],
      ["task-created", "Ivan", MONDAY_9AM, "Винена листа 2027"],
    ]);
    expect(emails.sent).toHaveLength(1);
  });

  it("an edit just over 10 minutes later is a new item, and everyone is notified again", async () => {
    const ivan = await createUser("Ivan");
    await createUser("Maria");
    const task = await postTask(ivan);

    await edit(ivan, task.id, "Винена листа", mondayAt10(0));
    await edit(ivan, task.id, "Винена листа 2027", mondayAt10(10, 1));

    expect(await feedRows(ivan)).toEqual([
      ["task-edited", "Ivan", mondayAt10(10, 1), "Винена листа 2027"],
      ["task-edited", "Ivan", mondayAt10(0), "Винена листа 2027"],
      ["task-created", "Ivan", MONDAY_9AM, "Винена листа 2027"],
    ]);
    expect(emails.sent.map((email) => email.to)).toEqual([["maria@avexim.test"], ["maria@avexim.test"]]);
  });

  it("a chain of edits each under 10 minutes apart stays one item, at the last edit, though it spans more than 10 minutes", async () => {
    const ivan = await createUser("Ivan");
    await createUser("Maria");
    const task = await postTask(ivan);

    await edit(ivan, task.id, "Винена листа 1", mondayAt10(0));
    await edit(ivan, task.id, "Винена листа 2", mondayAt10(8));
    await edit(ivan, task.id, "Винена листа 3", mondayAt10(16));
    await edit(ivan, task.id, "Винена листа 4", mondayAt10(24));

    expect(await feedRows(ivan)).toEqual([
      ["task-edited", "Ivan", mondayAt10(24), "Винена листа 4"],
      ["task-created", "Ivan", MONDAY_9AM, "Винена листа 4"],
    ]);
    expect(emails.sent).toHaveLength(1);
  });

  // Only the Task Owner may edit a Task, so another Actor can never edit the
  // same Task: the closest case is another Actor editing their own Task.
  it("Maria editing her own Task minutes after Ivan edits his is a separate item, and each edit is notified", async () => {
    const ivan = await createUser("Ivan");
    const maria = await createUser("Maria");
    const ivansTask = await postTask(ivan, { title: "Винена листа" });
    const mariasTask = await postTask(maria, { title: "Инвентаризация" });

    await edit(ivan, ivansTask.id, "Винена листа 2027", mondayAt10(0));
    await edit(maria, mariasTask.id, "Инвентаризация на склада", mondayAt10(2));

    const feed = await activity.feed(ivan, {});
    expect(feed.items.slice(0, 2).map((item) => [item.type, item.actor.name, item.occurredAt, item.task.id])).toEqual([
      ["task-edited", "Maria", mondayAt10(2), mariasTask.id],
      ["task-edited", "Ivan", mondayAt10(0), ivansTask.id],
    ]);
    expect(emails.sent.map((email) => email.to)).toEqual([["maria@avexim.test"], ["ivan@avexim.test"]]);
  });

  it("someone else marking the Task Done in between doesn't stop the Task Owner's edits merging", async () => {
    const ivan = await createUser("Ivan");
    const maria = await createUser("Maria");
    const task = await postTask(ivan);

    await edit(ivan, task.id, "Винена листа", mondayAt10(0));
    await tasks.setDone(maria, { taskId: task.id, isDone: true, now: mondayAt10(3) });
    await edit(ivan, task.id, "Винена листа 2027", mondayAt10(6));

    expect(await feedRows(ivan)).toEqual([
      ["task-edited", "Ivan", mondayAt10(6), "Винена листа 2027"],
      ["task-done", "Maria", mondayAt10(3), "Винена листа 2027"],
      ["task-created", "Ivan", MONDAY_9AM, "Винена листа 2027"],
    ]);
    // Maria is told of Ivan's edit once; Ivan is told Maria marked it Done.
    expect(emails.sent.map((email) => email.to)).toEqual([["maria@avexim.test"], ["ivan@avexim.test"]]);
  });

  describe("other Activity types are never merged", () => {
    it("an edit minutes after posting the Task is its own item, and everyone is notified of both", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      emails.sent.length = 0;

      const task = await tasks.create(ivan, {
        title: "Нова винена листа",
        description: "Да се обнови до петък",
        category: "golf-clubs",
        fileIds: [],
        now: mondayAt10(0),
      });
      if (!task.ok) throw new Error(`Could not post a Task: ${JSON.stringify(task.errors)}`);
      await edit(ivan, task.task.id, "Винена листа 2027", mondayAt10(2));

      expect(await feedRows(ivan)).toEqual([
        ["task-edited", "Ivan", mondayAt10(2), "Винена листа 2027"],
        ["task-created", "Ivan", mondayAt10(0), "Винена листа 2027"],
      ]);
      expect(emails.sent).toHaveLength(2);
    });

    it("Maria marking the Task Done, not Done and Done again within minutes records and notifies each one", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);

      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: mondayAt10(0) });
      await tasks.setDone(maria, { taskId: task.id, isDone: false, now: mondayAt10(1) });
      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: mondayAt10(2) });

      expect((await feedRows(ivan)).map(([type, , occurredAt]) => [type, occurredAt])).toEqual([
        ["task-done", mondayAt10(2)],
        ["task-not-done", mondayAt10(1)],
        ["task-done", mondayAt10(0)],
        ["task-created", MONDAY_9AM],
      ]);
      expect(emails.sent).toHaveLength(3);
    });
  });
});
