import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { createNotifications } from "@/lib/notifications";
import { createTasks } from "@/lib/tasks";
import { createComments } from "@/lib/comments";
import { activity } from "@/lib/activity";
import type { Actor } from "@/lib/actor";
import { createUser } from "./support/fixtures";

const MONDAY_8AM = new Date("2026-11-02T08:00:00Z");
const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");
const MONDAY_11AM = new Date("2026-11-02T11:00:00Z");
const MONDAY_NOON = new Date("2026-11-02T12:00:00Z");
const minutesAfter = (time: Date, minutes: number) => new Date(time.getTime() + minutes * 60_000);

describe("Unread", () => {
  let tasks: ReturnType<typeof createTasks>;
  let comments: ReturnType<typeof createComments>;

  beforeEach(() => {
    const notifications = createNotifications({ emailAdapter: new InMemoryEmailAdapter() });
    tasks = createTasks({ notifications });
    comments = createComments({ notifications });
  });

  /** Posts a Task as `owner`. */
  async function postTask(owner: Actor, { title = "Нова винена листа", now = MONDAY_9AM } = {}) {
    const result = await tasks.create(owner, {
      title,
      description: "Да се обнови до петък",
      category: "golf-clubs",
      fileIds: [],
      now,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    return result.task;
  }

  /** Posts a Comment. */
  async function post(author: Actor, taskId: string, text: string, { now = MONDAY_10AM } = {}) {
    const result = await comments.post(author, { taskId, text, now });
    if (!result.ok) throw new Error(`Could not post a Comment: ${result.error}`);
    return result.comment;
  }

  /** What a page of the Feed shows `viewer`, as [what happened, is it Unread]. */
  async function feedAs(viewer: Actor, { page = 1 } = {}) {
    const { items } = await activity.feed(viewer, { page });
    return items.map((item) => [item.comment?.excerpt ?? item.type, item.unread]);
  }

  describe("visiting the Feed", () => {
    it("what Maria did after Ivan last opened the Feed is Unread for him; what she did before is not", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await activity.markFeedSeen(ivan, { now: MONDAY_9AM });
      await post(maria, task.id, "Кога е срокът?", { now: MONDAY_10AM });

      expect(await feedAs(ivan)).toEqual([
        ["Кога е срокът?", true],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(1);
    });

    it("opening the Feed marks everything up to that moment as read, and only that", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await post(maria, task.id, "Първи въпрос", { now: MONDAY_10AM });
      await post(maria, task.id, "Втори въпрос", { now: MONDAY_11AM });

      await activity.markFeedSeen(ivan, { now: MONDAY_10AM });

      expect(await feedAs(ivan)).toEqual([
        ["Втори въпрос", true],
        ["Първи въпрос", false],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(1);
    });

    it("Ivan's own actions are never Unread for him, even before he has opened the Feed", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan, { now: MONDAY_9AM });
      await post(ivan, task.id, "Бележка към себе си", { now: MONDAY_10AM });
      await tasks.setDone(ivan, { taskId: task.id, isDone: true, now: MONDAY_11AM });

      expect(await feedAs(ivan)).toEqual([
        ["task-done", false],
        ["Бележка към себе си", false],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(0);
    });

    it("everything others did is Unread for someone who has never opened the Feed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await post(maria, task.id, "Кога е срокът?", { now: MONDAY_10AM });

      expect(await feedAs(ivan)).toEqual([
        ["Кога е срокът?", true],
        ["task-created", true],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(2);
    });

    it("an older visit arriving late doesn't make anything Unread again", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await postTask(maria, { now: MONDAY_10AM });

      await activity.markFeedSeen(ivan, { now: MONDAY_11AM });
      await activity.markFeedSeen(ivan, { now: MONDAY_9AM });

      expect(await feedAs(ivan)).toEqual([["task-created", false]]);
      expect(await activity.unreadCount(ivan)).toBe(0);
    });

    it("the visit counts from when the Feed was shown, not when it was recorded", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await post(maria, task.id, "Пристигна след показването", { now: MONDAY_11AM });

      await activity.markFeedSeen(ivan, { shownAt: MONDAY_10AM, now: MONDAY_NOON });

      expect(await feedAs(ivan)).toEqual([
        ["Пристигна след показването", true],
        ["task-created", false],
      ]);
    });

    it("a Feed shown at a time still to come counts only up to now", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });

      await activity.markFeedSeen(ivan, { shownAt: MONDAY_NOON, now: MONDAY_10AM });
      await post(maria, task.id, "Кога е срокът?", { now: MONDAY_11AM });

      expect(await feedAs(ivan)).toEqual([
        ["Кога е срокът?", true],
        ["task-created", false],
      ]);
    });

    it("the count covers every page of the Feed, and each page marks its own items", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_8AM });
      for (let i = 1; i <= 24; i++) {
        await post(maria, task.id, `Коментар ${i}`, { now: minutesAfter(MONDAY_9AM, i) });
      }
      await activity.markFeedSeen(ivan, { now: MONDAY_9AM });

      expect(await feedAs(ivan, { page: 2 })).toEqual([
        ["Коментар 4", true],
        ["Коментар 3", true],
        ["Коментар 2", true],
        ["Коментар 1", true],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(24);
    });
  });

  describe("opening a Task", () => {
    it("marks that Task's items up to that moment as read, but not other Tasks' items", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const wineList = await postTask(maria, { title: "Винена листа", now: MONDAY_8AM });
      const stocktake = await postTask(maria, { title: "Инвентаризация", now: MONDAY_9AM });
      await post(maria, wineList.id, "По листата", { now: MONDAY_10AM });
      await post(maria, stocktake.id, "По склада", { now: minutesAfter(MONDAY_10AM, 30) });
      await activity.markFeedSeen(ivan, { now: MONDAY_8AM });

      await activity.markTaskOpened(ivan, { taskId: wineList.id, now: MONDAY_11AM });
      await post(maria, wineList.id, "Още по листата", { now: MONDAY_NOON });

      expect(await feedAs(ivan)).toEqual([
        ["Още по листата", true],
        ["По склада", true],
        ["По листата", false],
        ["task-created", true], // Инвентаризация
        ["task-created", false], // Винена листа, before the Feed visit
      ]);
      expect(await activity.unreadCount(ivan)).toBe(3);
    });

    it("an item is read once either the Feed visit or the Task opening is newer than it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_8AM });
      await post(maria, task.id, "Преди отварянето на задачата", { now: MONDAY_9AM });
      await activity.markTaskOpened(ivan, { taskId: task.id, now: MONDAY_10AM });
      await post(maria, task.id, "Преди посещението на активността", { now: MONDAY_11AM });

      await activity.markFeedSeen(ivan, { now: MONDAY_NOON });

      expect(await feedAs(ivan)).toEqual([
        ["Преди посещението на активността", false],
        ["Преди отварянето на задачата", false],
        ["task-created", false],
      ]);
    });

    it("an older opening arriving late doesn't make anything Unread again", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_10AM });

      await activity.markTaskOpened(ivan, { taskId: task.id, now: MONDAY_11AM });
      await activity.markTaskOpened(ivan, { taskId: task.id, now: MONDAY_9AM });
      await activity.markTaskOpened(ivan, { taskId: task.id, now: MONDAY_11AM });

      expect(await feedAs(ivan)).toEqual([["task-created", false]]);
      expect(await activity.unreadCount(ivan)).toBe(0);
    });

    it("the opening counts from when the Task was shown, not when it was recorded", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await post(maria, task.id, "Пристигна след показването", { now: MONDAY_11AM });

      await activity.markTaskOpened(ivan, { taskId: task.id, shownAt: MONDAY_10AM, now: MONDAY_NOON });

      expect(await feedAs(ivan)).toEqual([
        ["Пристигна след показването", true],
        ["task-created", false],
      ]);
    });

    it("a Task shown at a time still to come counts only up to now", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });

      await activity.markTaskOpened(ivan, { taskId: task.id, shownAt: MONDAY_NOON, now: MONDAY_10AM });
      await post(maria, task.id, "Кога е срокът?", { now: MONDAY_11AM });

      expect(await feedAs(ivan)).toEqual([
        ["Кога е срокът?", true],
        ["task-created", false],
      ]);
    });

    it("opening one person's Task doesn't mark it read for anyone else", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await activity.markTaskOpened(ivan, { taskId: task.id, now: MONDAY_10AM });

      expect(await feedAs(georgi)).toEqual([["task-created", true]]);
      expect(await activity.unreadCount(georgi)).toBe(1);
    });
  });

  describe("Activities of a deleted Task", () => {
    it("the deletion is Unread, while what Ivan read before stays read", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_10AM });
      await activity.markTaskOpened(ivan, { taskId: task.id, now: MONDAY_10AM });

      await tasks.delete(maria, { taskId: task.id, now: MONDAY_11AM });

      expect(await feedAs(ivan)).toEqual([
        ["task-deleted", true],
        ["task-done", false],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(1);
    });

    it("opening the Feed marks the deletion as read", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      await tasks.delete(maria, { taskId: task.id, now: MONDAY_10AM });

      await activity.markFeedSeen(ivan, { now: MONDAY_11AM });

      expect(await feedAs(ivan)).toEqual([
        ["task-deleted", false],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(0);
    });
  });

  describe("merged edits", () => {
    it("a repeat edit moves the item past Ivan's Feed visit, so it is Unread again", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(maria, { now: MONDAY_9AM });
      const edit = (title: string, now: Date) =>
        tasks.edit(maria, {
          taskId: task.id,
          title,
          description: "Да се обнови до петък",
          addedFileIds: [],
          removedFileIds: [],
          now,
        });
      await edit("Винена листа", MONDAY_10AM);
      await activity.markFeedSeen(ivan, { now: minutesAfter(MONDAY_10AM, 5) });
      expect(await activity.unreadCount(ivan)).toBe(0);

      await edit("Винена листа 2027", minutesAfter(MONDAY_10AM, 8));

      expect(await feedAs(ivan)).toEqual([
        ["task-edited", true],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(1);
    });
  });

  describe("on launch day", () => {
    const migration = (name: string) =>
      readFileSync(fileURLToPath(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url)), "utf8");

    it("the Feed filled from existing data starts as read for everyone, and later news is Unread", async () => {
      // Data as it exists before the migrations: posted before Activities were recorded.
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await prisma.task.create({
        data: {
          title: "Нова винена листа",
          description: "Да се обнови до петък",
          category: "golf-clubs",
          userId: ivan.id,
          createdAt: new Date("2026-10-01T08:00:00Z"),
        },
      });
      await prisma.comment.create({
        data: {
          text: "Кога трябва да е готово?",
          taskId: task.id,
          userId: maria.id,
          createdAt: new Date("2026-10-02T09:00:00Z"),
        },
      });

      await prisma.$executeRawUnsafe(migration("20261107210001_activity_backfill"));
      await prisma.$executeRawUnsafe(migration("20261107220001_unread_backfill"));

      expect(await feedAs(ivan)).toEqual([
        ["Кога трябва да е готово?", false],
        ["task-created", false],
      ]);
      expect(await activity.unreadCount(ivan)).toBe(0);
      expect(await activity.unreadCount(maria)).toBe(0);

      // The migrations ran at the real current time, so news comes after it.
      await post(maria, task.id, "Готово е", { now: new Date(Date.now() + 60_000) });
      expect(await activity.unreadCount(ivan)).toBe(1);
    });
  });
});
