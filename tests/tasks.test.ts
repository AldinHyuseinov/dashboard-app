import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { InMemoryPushAdapter } from "@/lib/push-adapter";
import { createNotifications } from "@/lib/notifications";
import { createTasks } from "@/lib/tasks";
import { createComments } from "@/lib/comments";
import type { Actor } from "@/lib/actor";
import { createUser, givePicture } from "./support/fixtures";

const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");

describe("Tasks", () => {
  let emails: InMemoryEmailAdapter;
  let tasks: ReturnType<typeof createTasks>;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    tasks = createTasks({ notifications: createNotifications({ emailAdapter: emails, pushAdapter: new InMemoryPushAdapter() }) });
  });

  /** Posts a Task as `owner`, then forgets the email it sent. */
  async function postTask(
    owner: Actor,
    {
      title = "Нова винена листа",
      category = "golf-clubs",
      now = MONDAY_9AM,
      fileIds = [] as string[],
    } = {},
  ) {
    const result = await tasks.create(owner, {
      title,
      description: "Да се обнови до петък",
      category,
      fileIds,
      now,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    emails.sent.length = 0;
    return result.task;
  }

  describe("creating a Task", () => {
    it("Ivan posts a Task into Golf Clubs; it is his, not Done, and everyone else is emailed", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");

      const result = await tasks.create(ivan, {
        title: "Нова винена листа",
        description: "Да се обнови до петък",
        category: "golf-clubs",
        fileIds: [],
        now: MONDAY_9AM,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const task = await tasks.get(ivan, result.task.id);
      expect(task).toMatchObject({
        title: "Нова винена листа",
        description: "Да се обнови до петък",
        category: "golf-clubs",
        isDone: false,
        userId: ivan.id,
        user: { name: "Ivan", image: null },
        files: [],
        createdAt: MONDAY_9AM,
        updatedAt: MONDAY_9AM,
      });
      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to).toEqual(["maria@avexim.test"]);
      expect(emails.sent[0].subject).toBe("Известие за задача");
      expect(emails.sent[0].html).toContain("Създадена нова задача в категория: Голф Клубове");
    });

    it("the Task carries its Owner's Profile picture address when they have one", async () => {
      const ivan = await createUser("Ivan");
      const ivans = await givePicture(ivan);

      const result = await tasks.create(ivan, {
        title: "Нова винена листа",
        description: "Да се обнови до петък",
        category: "golf-clubs",
        fileIds: [],
        now: MONDAY_9AM,
      });
      if (!result.ok) throw new Error("Could not post a Task");

      expect(await tasks.get(ivan, result.task.id)).toMatchObject({ user: { name: "Ivan", image: ivans } });
    });

    it.each([
      ["a Category that doesn't exist", "no-such-category"],
      ["the Venues Category Group", "venues"],
    ])("is refused in %s, with a Bulgarian error and no email", async (_, category) => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");

      const result = await tasks.create(ivan, {
        title: "Изгубена задача",
        description: "Никой не би я видял",
        category,
        fileIds: [],
        now: MONDAY_9AM,
      });

      expect(result).toEqual({
        ok: false,
        errors: { form: "Задачи могат да се публикуват само в съществуваща категория." },
      });
      expect(await tasks.list(ivan, { category, page: 1 })).toMatchObject({ tasks: [] });
      expect(emails.sent).toEqual([]);
    });

    it("is refused without a title or description", async () => {
      const ivan = await createUser("Ivan");

      const result = await tasks.create(ivan, {
        title: "",
        description: "",
        category: "bars",
        fileIds: [],
        now: MONDAY_9AM,
      });

      expect(result).toEqual({
        ok: false,
        errors: {
          title: ["Заглавието е задължително."],
          description: ["Описанието е задължително."],
        },
      });
      expect(await tasks.list(ivan, { category: "bars", page: 1 })).toMatchObject({ tasks: [] });
    });
  });

  describe("editing a Task", () => {
    it("the Task Owner changes the title and description, and everyone else is emailed", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      const { id } = await postTask(ivan);

      const result = await tasks.edit(ivan, {
        taskId: id,
        title: "Винена листа 2027",
        description: "Готово до понеделник",
        addedFileIds: [],
        removedFileIds: [],
        now: MONDAY_10AM,
      });

      expect(result).toEqual({ ok: true, task: { id, category: "golf-clubs" } });
      expect(await tasks.get(ivan, id)).toMatchObject({
        title: "Винена листа 2027",
        description: "Готово до понеделник",
      });
      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to).toEqual(["maria@avexim.test"]);
      expect(emails.sent[0].html).toContain("Обновена задача в категория: Голф Клубове");
    });

    it("is refused to anyone but the Task Owner, and the Task stays as it was", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const { id } = await postTask(ivan);

      const result = await tasks.edit(maria, {
        taskId: id,
        title: "Чужда промяна",
        description: "Чужда промяна",
        addedFileIds: [],
        removedFileIds: [],
        now: MONDAY_10AM,
      });

      expect(result).toEqual({ ok: false, errors: { form: "Неупълномощен достъп." } });
      expect(await tasks.get(maria, id)).toMatchObject({ title: "Нова винена листа" });
      expect(emails.sent).toEqual([]);
    });

    it("reports a Task that no longer exists", async () => {
      const ivan = await createUser("Ivan");

      const result = await tasks.edit(ivan, {
        taskId: "missing-task",
        title: "Заглавие",
        description: "Описание",
        addedFileIds: [],
        removedFileIds: [],
        now: MONDAY_10AM,
      });

      expect(result).toEqual({ ok: false, errors: { form: "Задачата не е намерена." } });
    });
  });

  describe("deleting a Task", () => {
    it("the Task Owner deletes it, and everyone else is emailed", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      const { id } = await postTask(ivan, { category: "warehouse" });

      const result = await tasks.delete(ivan, { taskId: id, now: MONDAY_10AM });

      expect(result).toEqual({ ok: true, task: { id, category: "warehouse" } });
      expect(await tasks.get(ivan, id)).toBeNull();
      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to).toEqual(["maria@avexim.test"]);
      expect(emails.sent[0].html).toContain("Изтрита задача в категория: Склад");
    });

    it("takes its Comments with it, including Replies that answer other Replies", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const { id } = await postTask(ivan);
      const notifications = createNotifications({ emailAdapter: emails, pushAdapter: new InMemoryPushAdapter() });
      const comments = createComments({ notifications });
      const comment = await comments.post(maria, { taskId: id, text: "Кога?", now: MONDAY_10AM });
      if (!comment.ok) throw new Error(comment.error);
      const reply = await comments.post(ivan, {
        taskId: id,
        text: "До петък",
        replyToId: comment.comment.id,
        now: MONDAY_10AM,
      });
      if (!reply.ok) throw new Error(reply.error);
      await comments.post(maria, {
        taskId: id,
        text: "Добре",
        replyToId: reply.comment.id,
        now: MONDAY_10AM,
      });

      const result = await tasks.delete(ivan, { taskId: id, now: MONDAY_10AM });

      expect(result.ok).toBe(true);
      expect(await tasks.get(ivan, id)).toBeNull();
      expect(await comments.list(ivan, id)).toEqual([]);
    });

    it("is refused to anyone but the Task Owner, and the Task is kept", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const { id } = await postTask(ivan);

      const result = await tasks.delete(maria, { taskId: id, now: MONDAY_10AM });

      expect(result).toEqual({
        ok: false,
        errors: { form: "Само собственикът на задачата може да я изтрие." },
      });
      expect(await tasks.get(maria, id)).not.toBeNull();
      expect(emails.sent).toEqual([]);
    });

    it("reports a Task that no longer exists", async () => {
      const ivan = await createUser("Ivan");

      expect(await tasks.delete(ivan, { taskId: "missing-task", now: MONDAY_10AM })).toEqual({
        ok: false,
        errors: { form: "Задачата не е намерена." },
      });
    });
  });

  describe("marking a Task Done or not Done", () => {
    it("anyone, not only the Task Owner, can mark it Done and then not Done again", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const { id } = await postTask(ivan, { category: "events" });

      const done = await tasks.setDone(maria, { taskId: id, isDone: true, now: MONDAY_10AM });

      expect(done).toEqual({ ok: true, task: { id, category: "events" } });
      expect(await tasks.get(ivan, id)).toMatchObject({ isDone: true });

      await tasks.setDone(ivan, { taskId: id, isDone: false, now: MONDAY_10AM });

      expect(await tasks.get(ivan, id)).toMatchObject({ isDone: false });
    });

    it("emails the Task Owner when someone else marks it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const { id } = await postTask(ivan);

      await tasks.setDone(maria, { taskId: id, isDone: true, now: MONDAY_10AM });

      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to).toEqual(["ivan@avexim.test"]);
    });

    it("reports a Task that no longer exists", async () => {
      const ivan = await createUser("Ivan");

      expect(await tasks.setDone(ivan, { taskId: "missing-task", isDone: true, now: MONDAY_10AM })).toEqual({
        ok: false,
        errors: { form: "Задачата не е намерена." },
      });
    });
  });

  describe("listing a Category's Tasks", () => {
    const minutesAfter9 = (minutes: number) => new Date(MONDAY_9AM.getTime() + minutes * 60_000);

    it("shows five Tasks per page, most recently updated first, and only that Category's", async () => {
      const ivan = await createUser("Ivan");
      for (let i = 1; i <= 7; i++) {
        await postTask(ivan, { title: `Бар ${i}`, category: "bars", now: minutesAfter9(i) });
      }
      await postTask(ivan, { title: "Хотел", category: "hotels", now: minutesAfter9(8) });

      const first = await tasks.list(ivan, { category: "bars", page: 1 });
      const second = await tasks.list(ivan, { category: "bars", page: 2 });

      expect(first.tasks.map((t) => t.title)).toEqual(["Бар 7", "Бар 6", "Бар 5", "Бар 4", "Бар 3"]);
      expect(second.tasks.map((t) => t.title)).toEqual(["Бар 2", "Бар 1"]);
      expect(first).toMatchObject({ currentPage: 1, totalPages: 2 });
      expect(second).toMatchObject({ currentPage: 2, totalPages: 2 });
    });

    it("moves a Task to the top when it is edited or marked Done", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const oldest = await postTask(ivan, { title: "Най-стара", category: "bars", now: minutesAfter9(1) });
      const middle = await postTask(ivan, { title: "Средна", category: "bars", now: minutesAfter9(2) });
      await postTask(ivan, { title: "Най-нова", category: "bars", now: minutesAfter9(3) });

      await tasks.setDone(maria, { taskId: middle.id, isDone: true, now: minutesAfter9(4) });
      await tasks.edit(ivan, {
        taskId: oldest.id,
        title: "Най-стара, обновена",
        description: "Ново описание",
        addedFileIds: [],
        removedFileIds: [],
        now: minutesAfter9(5),
      });

      const { tasks: board } = await tasks.list(maria, { category: "bars", page: 1 });
      expect(board.map((t) => [t.title, t.isDone])).toEqual([
        ["Най-стара, обновена", false],
        ["Средна", true],
        ["Най-нова", false],
      ]);
    });

    it("shows each Task's owner", async () => {
      const ivan = await createUser("Ivan");
      await postTask(ivan, { category: "cocktails" });

      const { tasks: board } = await tasks.list(ivan, { category: "cocktails", page: 1 });

      expect(board).toMatchObject([{ user: { name: "Ivan" }, files: [] }]);
    });
  });

  describe("counting each Category's Tasks that aren't Done", () => {
    it("counts only Tasks not yet Done, per Category, and leaves out Categories with none", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await postTask(ivan, { category: "bars" });
      const doneBar = await postTask(maria, { category: "bars" });
      await postTask(maria, { category: "bars" });
      await postTask(ivan, { category: "warehouse" });
      const doneHotel = await postTask(ivan, { category: "hotels" });
      await tasks.setDone(maria, { taskId: doneBar.id, isDone: true, now: MONDAY_10AM });
      await tasks.setDone(maria, { taskId: doneHotel.id, isDone: true, now: MONDAY_10AM });

      expect(await tasks.notDoneCounts(ivan)).toEqual({ bars: 2, warehouse: 1 });
    });

    it("counts a Task again once it is marked not Done, and forgets a deleted one", async () => {
      const ivan = await createUser("Ivan");
      const reopened = await postTask(ivan, { category: "events" });
      const deleted = await postTask(ivan, { category: "events" });
      await tasks.setDone(ivan, { taskId: reopened.id, isDone: true, now: MONDAY_10AM });
      await tasks.setDone(ivan, { taskId: reopened.id, isDone: false, now: MONDAY_10AM });
      await tasks.delete(ivan, { taskId: deleted.id, now: MONDAY_10AM });

      expect(await tasks.notDoneCounts(ivan)).toEqual({ events: 1 });
    });
  });
});
