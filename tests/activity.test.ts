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

const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");
const MONDAY_11AM = new Date("2026-11-02T11:00:00Z");
const MONDAY_NOON = new Date("2026-11-02T12:00:00Z");

describe("Activity Feed", () => {
  let tasks: ReturnType<typeof createTasks>;
  let comments: ReturnType<typeof createComments>;

  beforeEach(() => {
    const notifications = createNotifications({ emailAdapter: new InMemoryEmailAdapter() });
    tasks = createTasks({ notifications });
    comments = createComments({ notifications });
  });

  /** Posts a Task as `owner`. */
  async function postTask(
    owner: Actor,
    { title = "Нова винена листа", category = "golf-clubs", now = MONDAY_9AM } = {},
  ) {
    const result = await tasks.create(owner, {
      title,
      description: "Да се обнови до петък",
      category,
      fileIds: [],
      now,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    return result.task;
  }

  /** Posts a Comment, or a Reply to `replyToId`. */
  async function post(
    author: Actor,
    taskId: string,
    text: string,
    { replyToId, now = MONDAY_10AM }: { replyToId?: string; now?: Date } = {},
  ) {
    const result = await comments.post(author, { taskId, text, replyToId, now });
    if (!result.ok) throw new Error(`Could not post a Comment: ${result.error}`);
    return result.comment;
  }

  describe("recording Task Activities", () => {
    it("Ivan posts a Task into Golf Clubs; the Feed shows that he created it, and when", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");

      const task = await postTask(ivan);

      const feed = await activity.feed(maria, { page: 1 });
      expect(feed.items).toEqual([
        {
          id: expect.any(String),
          type: "task-created",
          actor: { id: ivan.id, name: "Ivan" },
          occurredAt: MONDAY_9AM,
          task: {
            id: task.id,
            title: "Нова винена листа",
            category: "golf-clubs",
            categoryLabel: "Голф Клубове",
            deleted: false,
          },
          comment: null,
        },
      ]);
    });

    it("the Task Owner edits the Task; the Feed shows the edit, and every item shows the new title", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan);

      await tasks.edit(ivan, {
        taskId: task.id,
        title: "Винена листа 2027",
        description: "Готово до понеделник",
        addedFileIds: [],
        removedFileIds: [],
        now: MONDAY_10AM,
      });

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items.map((item) => [item.type, item.actor.name, item.occurredAt, item.task.title])).toEqual([
        ["task-edited", "Ivan", MONDAY_10AM, "Винена листа 2027"],
        ["task-created", "Ivan", MONDAY_9AM, "Винена листа 2027"],
      ]);
    });

    it("Maria marks Ivan's Task Done and then not Done; marking it with the status it has records nothing", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);

      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_10AM });
      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_11AM });
      await tasks.setDone(maria, { taskId: task.id, isDone: false, now: MONDAY_NOON });

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items.map((item) => [item.type, item.actor.name, item.occurredAt])).toEqual([
        ["task-not-done", "Maria", MONDAY_NOON],
        ["task-done", "Maria", MONDAY_10AM],
        ["task-created", "Ivan", MONDAY_9AM],
      ]);
    });

    it("the Task Owner deletes the Task; its items stay, marked deleted, under its last title and Category", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan, { category: "warehouse" });
      await tasks.edit(ivan, {
        taskId: task.id,
        title: "Инвентаризация",
        description: "Преброяване в петък",
        addedFileIds: [],
        removedFileIds: [],
        now: MONDAY_10AM,
      });
      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_11AM });

      await tasks.delete(ivan, { taskId: task.id, now: MONDAY_NOON });

      const feed = await activity.feed(maria, { page: 1 });
      const deletedTask = {
        id: task.id,
        title: "Инвентаризация",
        category: "warehouse",
        categoryLabel: "Склад",
        deleted: true,
      };
      expect(feed.items).toMatchObject([
        { type: "task-deleted", actor: { name: "Ivan" }, occurredAt: MONDAY_NOON, task: deletedTask },
        { type: "task-done", actor: { name: "Maria" }, task: deletedTask },
        { type: "task-edited", actor: { name: "Ivan" }, task: deletedTask },
        { type: "task-created", actor: { name: "Ivan" }, task: deletedTask },
      ]);
    });
  });

  describe("recording Comment Activities", () => {
    it("Maria comments and Ivan replies; each item shows the start of the Comment's current text", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога трябва да е готово?", { now: MONDAY_10AM });
      const reply = await post(ivan, task.id, "До петък", { replyToId: comment.id, now: MONDAY_11AM });

      await comments.edit(maria, { commentId: comment.id, text: "Кога точно трябва да е готово?", now: MONDAY_NOON });

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items).toMatchObject([
        {
          type: "reply-posted",
          actor: { name: "Ivan" },
          occurredAt: MONDAY_11AM,
          task: { id: task.id, title: "Нова винена листа", categoryLabel: "Голф Клубове" },
          comment: { id: reply.id, excerpt: "До петък" },
        },
        {
          type: "comment-posted",
          actor: { name: "Maria" },
          occurredAt: MONDAY_10AM,
          task: { id: task.id, title: "Нова винена листа", categoryLabel: "Голф Клубове" },
          comment: { id: comment.id, excerpt: "Кога точно трябва да е готово?" },
        },
        { type: "task-created", comment: null },
      ]);
    });

    it("shows only the start of a long Comment", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan);
      await post(
        ivan,
        task.id,
        "Моля, до края на седмицата всеки да провери наличностите на своя обект и да изпрати " +
          "списък с липсващите позиции, за да може складът да подготви доставките навреме.",
      );

      const [item] = (await activity.feed(ivan, { page: 1 })).items;
      expect(item.comment?.excerpt).toBe(
        "Моля, до края на седмицата всеки да провери наличностите на своя обект и да изпрати списък с липсващ…",
      );
    });

    it("adding a Reaction records nothing", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Готово");

      await comments.react(ivan, { commentId: comment.id, emoji: "👍" });

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items.map((item) => item.type)).toEqual(["comment-posted", "task-created"]);
    });
  });

  describe("deleting Comments", () => {
    it("deleting a Reply removes only its item", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога?", { now: MONDAY_10AM });
      const reply = await post(ivan, task.id, "До петък", { replyToId: comment.id, now: MONDAY_11AM });

      await comments.delete(ivan, reply.id);

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items.map((item) => [item.type, item.comment?.excerpt])).toEqual([
        ["comment-posted", "Кога?"],
        ["task-created", undefined],
      ]);
    });

    it("deleting a top-level Comment removes its item and its Replies' items", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога?", { now: MONDAY_10AM });
      const reply = await post(ivan, task.id, "До петък", { replyToId: comment.id, now: MONDAY_11AM });
      await post(maria, task.id, "Добре", { replyToId: reply.id, now: MONDAY_NOON });
      await post(ivan, task.id, "Друг въпрос?", { now: MONDAY_NOON });

      await comments.delete(maria, comment.id);

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items.map((item) => [item.type, item.comment?.excerpt])).toEqual([
        ["comment-posted", "Друг въпрос?"],
        ["task-created", undefined],
      ]);
    });

    it("deleting a Task removes its Comments' items, while its Task items stay", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога?", { now: MONDAY_10AM });
      await post(ivan, task.id, "До петък", { replyToId: comment.id, now: MONDAY_11AM });

      await tasks.delete(ivan, { taskId: task.id, now: MONDAY_NOON });

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items.map((item) => [item.type, item.task.deleted])).toEqual([
        ["task-deleted", true],
        ["task-created", true],
      ]);
    });
  });

  describe("paging through the Feed", () => {
    const minutesAfter9 = (minutes: number) => new Date(MONDAY_9AM.getTime() + minutes * 60_000);

    it("shows twenty items per page, newest first, across Tasks", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const bar = await postTask(ivan, { title: "Бар", category: "bars", now: minutesAfter9(0) });
      const hotel = await postTask(maria, { title: "Хотел", category: "hotels", now: minutesAfter9(1) });
      for (let i = 2; i <= 24; i++) {
        await post(i % 2 ? maria : ivan, i % 2 ? hotel.id : bar.id, `Коментар ${i}`, { now: minutesAfter9(i) });
      }

      const first = await activity.feed(ivan, { page: 1 });
      const second = await activity.feed(ivan, { page: 2 });

      expect(first).toMatchObject({ currentPage: 1, totalPages: 2 });
      expect(first.items).toHaveLength(20);
      expect(first.items[0]).toMatchObject({ comment: { excerpt: "Коментар 24" }, task: { title: "Бар" } });
      expect(first.items[19]).toMatchObject({ comment: { excerpt: "Коментар 5" }, task: { title: "Хотел" } });
      expect(second).toMatchObject({ currentPage: 2, totalPages: 2 });
      expect(second.items.map((item) => [item.type, item.comment?.excerpt ?? item.task.title])).toEqual([
        ["comment-posted", "Коментар 4"],
        ["comment-posted", "Коментар 3"],
        ["comment-posted", "Коментар 2"],
        ["task-created", "Хотел"],
        ["task-created", "Бар"],
      ]);
    });

    it("treats a page number below 1 as the first page", async () => {
      const ivan = await createUser("Ivan");
      await postTask(ivan);

      expect(await activity.feed(ivan, { page: 0 })).toMatchObject({
        currentPage: 1,
        totalPages: 1,
        items: [{ type: "task-created" }],
      });
    });

    it("treats a page number past the end as the last page", async () => {
      const ivan = await createUser("Ivan");
      await postTask(ivan);

      expect(await activity.feed(ivan, { page: 99 })).toMatchObject({
        currentPage: 1,
        totalPages: 1,
        items: [{ type: "task-created" }],
      });
    });

    it("is empty, with no pages, before anything has happened", async () => {
      const ivan = await createUser("Ivan");

      expect(await activity.feed(ivan, { page: 1 })).toEqual({ items: [], currentPage: 1, totalPages: 0 });
    });
  });

  describe("filling the Feed on launch day", () => {
    const BACKFILL = readFileSync(
      fileURLToPath(new URL("../prisma/migrations/20261107210001_activity_backfill/migration.sql", import.meta.url)),
      "utf8",
    );

    it("records every existing Task's creation, Comment and Reply at its original time", async () => {
      // Data as it exists before the migration: posted before Activities were recorded.
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      const wineList = await prisma.task.create({
        data: {
          title: "Нова винена листа",
          description: "Да се обнови до петък",
          category: "golf-clubs",
          isDone: true,
          userId: ivan.id,
          createdAt: new Date("2026-10-01T08:00:00Z"),
        },
      });
      const stocktake = await prisma.task.create({
        data: {
          title: "Инвентаризация",
          description: "Преброяване в петък",
          category: "warehouse",
          userId: maria.id,
          createdAt: new Date("2026-10-03T08:00:00Z"),
        },
      });
      const question = await prisma.comment.create({
        data: {
          text: "Кога трябва да е готово?",
          taskId: wineList.id,
          userId: maria.id,
          createdAt: new Date("2026-10-02T09:00:00Z"),
        },
      });
      const answer = await prisma.comment.create({
        data: {
          text: "До петък",
          taskId: wineList.id,
          userId: ivan.id,
          parentId: question.id,
          answersId: question.id,
          createdAt: new Date("2026-10-02T10:00:00Z"),
        },
      });
      await prisma.comment.create({
        data: {
          text: "Ще помогна",
          taskId: wineList.id,
          userId: georgi.id,
          parentId: question.id,
          answersId: answer.id,
          createdAt: new Date("2026-10-04T11:00:00Z"),
        },
      });

      await prisma.$executeRawUnsafe(BACKFILL);

      const feed = await activity.feed(ivan, { page: 1 });
      expect(
        feed.items.map((item) => [
          item.type,
          item.actor.name,
          item.occurredAt.toISOString(),
          item.task.id,
          item.task.title,
          item.task.categoryLabel,
          item.task.deleted,
          item.comment?.excerpt,
        ]),
      ).toEqual([
        ["reply-posted", "Georgi", "2026-10-04T11:00:00.000Z", wineList.id, "Нова винена листа", "Голф Клубове", false, "Ще помогна"],
        ["task-created", "Maria", "2026-10-03T08:00:00.000Z", stocktake.id, "Инвентаризация", "Склад", false, undefined],
        ["reply-posted", "Ivan", "2026-10-02T10:00:00.000Z", wineList.id, "Нова винена листа", "Голф Клубове", false, "До петък"],
        ["comment-posted", "Maria", "2026-10-02T09:00:00.000Z", wineList.id, "Нова винена листа", "Голф Клубове", false, "Кога трябва да е готово?"],
        ["task-created", "Ivan", "2026-10-01T08:00:00.000Z", wineList.id, "Нова винена листа", "Голф Клубове", false, undefined],
      ]);
    });

    it("keeps backfilled items readable after their Task is deleted", async () => {
      const ivan = await createUser("Ivan");
      const task = await prisma.task.create({
        data: {
          title: "Стара задача",
          description: "Отпреди миграцията",
          category: "events",
          userId: ivan.id,
          createdAt: new Date("2026-10-01T08:00:00Z"),
        },
      });
      await prisma.$executeRawUnsafe(BACKFILL);

      await tasks.delete(ivan, { taskId: task.id, now: MONDAY_9AM });

      const feed = await activity.feed(ivan, { page: 1 });
      expect(feed.items).toMatchObject([
        { type: "task-deleted", task: { title: "Стара задача", categoryLabel: "Събития", deleted: true } },
        { type: "task-created", task: { title: "Стара задача", categoryLabel: "Събития", deleted: true } },
      ]);
    });
  });
});
