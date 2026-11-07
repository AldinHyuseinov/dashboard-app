import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { createNotifications } from "@/lib/notifications";
import { createTasks } from "@/lib/tasks";
import { createComments } from "@/lib/comments";
import type { Actor } from "@/lib/actor";
import { createUser } from "./support/fixtures";

const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");
const MONDAY_11AM = new Date("2026-11-02T11:00:00Z");

/**
 * Who is notified of what, by email. Every row of the spec's Recipient
 * rules table, observed through the in-memory EmailAdapter.
 */
describe("Notifications", () => {
  let emails: InMemoryEmailAdapter;
  let tasks: ReturnType<typeof createTasks>;
  let comments: ReturnType<typeof createComments>;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    const notifications = createNotifications({ emailAdapter: emails });
    tasks = createTasks({ notifications });
    comments = createComments({ notifications });
  });

  /** Everyone each email went to, one list per email, in sending order. */
  function recipients() {
    return emails.sent.map((email) => email.to.toSorted());
  }

  /** Posts a Task as `owner`, then forgets the email it sent. */
  async function postTask(owner: Actor, title = "Нова винена листа") {
    const result = await tasks.create(owner, {
      title,
      description: "Да се обнови до петък",
      category: "golf-clubs",
      fileIds: [],
      now: MONDAY_9AM,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    emails.sent.length = 0;
    return result.task;
  }

  /** Posts a Comment, or a Reply to `replyToId`, then forgets the email it sent. */
  async function post(author: Actor, taskId: string, text: string, replyToId?: string) {
    const result = await comments.post(author, { taskId, text, replyToId, now: MONDAY_10AM });
    if (!result.ok) throw new Error(`Could not post a Comment: ${result.error}`);
    emails.sent.length = 0;
    return result.comment;
  }

  describe("a Reply", () => {
    it("when Georgi replies to Maria's Comment on Ivan's Task, Maria and Ivan are notified, Petar is not", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      await createUser("Petar");
      const task = await postTask(ivan);
      const mariasComment = await post(maria, task.id, "Кой ще поеме това?");

      await comments.post(georgi, {
        taskId: task.id,
        text: "Аз",
        replyToId: mariasComment.id,
        now: MONDAY_11AM,
      });

      expect(recipients()).toEqual([["ivan@avexim.test", "maria@avexim.test"]]);
      expect(emails.sent[0].subject).toBe("Нов отговор: Нова винена листа");
    });

    it("when Maria replies to Georgi's Reply, Georgi and the Task Owner are notified, not the thread's top-level author", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      const petar = await createUser("Petar");
      const task = await postTask(ivan);
      const petarsComment = await post(petar, task.id, "Кой ще поеме това?");
      const georgisReply = await post(georgi, task.id, "Аз", petarsComment.id);

      await comments.post(maria, {
        taskId: task.id,
        text: "Благодаря",
        replyToId: georgisReply.id,
        now: MONDAY_11AM,
      });

      expect(recipients()).toEqual([["georgi@avexim.test", "ivan@avexim.test"]]);
    });

    it("when the answered Comment's author is the Task Owner, they get a single email", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);
      const ivansComment = await post(ivan, task.id, "Кой ще поеме това?");

      await comments.post(maria, {
        taskId: task.id,
        text: "Аз",
        replyToId: ivansComment.id,
        now: MONDAY_11AM,
      });

      expect(recipients()).toEqual([["ivan@avexim.test"]]);
    });

    it("when the Task Owner replies, only the answered Comment's author is notified", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);
      const mariasComment = await post(maria, task.id, "Кой ще поеме това?");

      await comments.post(ivan, {
        taskId: task.id,
        text: "Аз",
        replyToId: mariasComment.id,
        now: MONDAY_11AM,
      });

      expect(recipients()).toEqual([["maria@avexim.test"]]);
    });

    it("when Maria replies to her own Comment, only the Task Owner is notified", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);
      const mariasComment = await post(maria, task.id, "Кой ще поеме това?");

      await comments.post(maria, {
        taskId: task.id,
        text: "Ще го поема аз",
        replyToId: mariasComment.id,
        now: MONDAY_11AM,
      });

      expect(recipients()).toEqual([["ivan@avexim.test"]]);
    });

    it("when the Task Owner replies to their own Comment, nobody is notified", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      const task = await postTask(ivan);
      const ivansComment = await post(ivan, task.id, "Кой ще поеме това?");

      await comments.post(ivan, {
        taskId: task.id,
        text: "Ще го поема аз",
        replyToId: ivansComment.id,
        now: MONDAY_11AM,
      });

      expect(emails.sent).toEqual([]);
    });
  });

  describe("a Reaction", () => {
    it("when Maria reacts to Georgi's Comment on Ivan's Task, only Georgi is notified", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      await createUser("Petar");
      const task = await postTask(ivan);
      const georgisComment = await post(georgi, task.id, "Готово е");

      await comments.react(maria, { commentId: georgisComment.id, emoji: "👍" });

      expect(recipients()).toEqual([["georgi@avexim.test"]]);
      expect(emails.sent[0].subject).toBe("Нова реакция: Нова винена листа");
    });

    it("when Georgi reacts to his own Comment, nobody is notified", async () => {
      const ivan = await createUser("Ivan");
      const georgi = await createUser("Georgi");
      const task = await postTask(ivan);
      const georgisComment = await post(georgi, task.id, "Готово е");

      const result = await comments.react(georgi, { commentId: georgisComment.id, emoji: "👏" });

      expect(result).toMatchObject({ ok: true });
      expect(emails.sent).toEqual([]);
    });

    it("removing a Reaction notifies nobody", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const ivansComment = await post(ivan, task.id, "Готово е");
      await comments.react(maria, { commentId: ivansComment.id, emoji: "👍" });
      emails.sent.length = 0;

      await comments.react(maria, { commentId: ivansComment.id, emoji: "👍" });

      expect(emails.sent).toEqual([]);
    });
  });

  describe("marking a Task Done or not Done", () => {
    it("when Maria marks Ivan's Task Done and then not Done, only Ivan is notified, each time", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);

      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_10AM });
      await tasks.setDone(maria, { taskId: task.id, isDone: false, now: MONDAY_11AM });

      expect(recipients()).toEqual([["ivan@avexim.test"], ["ivan@avexim.test"]]);
      expect(emails.sent.map((email) => email.subject)).toEqual([
        "Отбелязана като завършена: Нова винена листа",
        "Отбелязана като незавършена: Нова винена листа",
      ]);
      expect(emails.sent[0].html).toContain("Maria");
      expect(emails.sent[0].html).toContain("Голф Клубове");
    });

    it("marking a Task Done that is already Done notifies nobody", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_10AM });
      emails.sent.length = 0;

      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_11AM });

      expect(emails.sent).toEqual([]);
    });

    it("when the Task Owner marks their own Task Done, nobody is notified", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      const task = await postTask(ivan);

      await tasks.setDone(ivan, { taskId: task.id, isDone: true, now: MONDAY_10AM });

      expect(emails.sent).toEqual([]);
    });

    it("the email shows the name and the Task title as plain text, not HTML", async () => {
      const ivan = await createUser("Ivan");
      const mallory = await createUser('<a href="https://evil.test">Мария</a>', "mallory@avexim.test");
      const task = await postTask(ivan, "<img src=x onerror=alert(1)>Листа & цени");

      await tasks.setDone(mallory, { taskId: task.id, isDone: true, now: MONDAY_10AM });

      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;Мария&lt;/a&gt;");
      expect(emails.sent[0].html).toContain("&lt;img src=x onerror=alert(1)&gt;Листа &amp; цени");
      expect(emails.sent[0].html).not.toContain("<a ");
      expect(emails.sent[0].html).not.toContain("<img");
    });
  });

  describe("news that goes to everyone", () => {
    it("when Maria creates, edits and deletes a Task, everyone else is notified each time", async () => {
      await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");

      const created = await tasks.create(maria, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_9AM,
      });
      if (!created.ok) throw new Error("Could not post a Task");
      await tasks.edit(maria, {
        taskId: created.task.id,
        title: "Инвентаризация на склада",
        description: "До края на месеца",
        addedFileIds: [],
        removedFileIds: [],
        now: MONDAY_10AM,
      });
      await tasks.delete(maria, { taskId: created.task.id, now: MONDAY_10AM });

      const everyoneElse = ["georgi@avexim.test", "ivan@avexim.test"];
      expect(recipients()).toEqual([everyoneElse, everyoneElse, everyoneElse]);
      expect(emails.sent.map((email) => email.html)).toEqual([
        expect.stringContaining("Създадена нова задача в категория: Склад"),
        expect.stringContaining("Обновена задача в категория: Склад"),
        expect.stringContaining("Изтрита задача в категория: Склад"),
      ]);
    });

    it("when Maria comments on Ivan's Task, everyone else is notified", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);

      await comments.post(maria, { taskId: task.id, text: "Ще го направя днес", now: MONDAY_10AM });

      expect(recipients()).toEqual([["georgi@avexim.test", "ivan@avexim.test"]]);
      expect(emails.sent[0].subject).toBe("Нов коментар: Нова винена листа");
    });

    it("sends nothing when the Actor is the only user", async () => {
      const ivan = await createUser("Ivan");

      await tasks.create(ivan, {
        title: "Нова винена листа",
        description: "Да се обнови до петък",
        category: "bars",
        fileIds: [],
        now: MONDAY_9AM,
      });

      expect(emails.sent).toEqual([]);
    });
  });

  describe("quiet actions", () => {
    it("editing a Comment, pinning and unpinning notify nobody", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const mariasComment = await post(maria, task.id, "Готово е");

      await comments.edit(maria, { commentId: mariasComment.id, text: "Готово е!", now: MONDAY_11AM });
      await comments.pin(ivan, mariasComment.id);
      await comments.pin(ivan, mariasComment.id);

      expect(emails.sent).toEqual([]);
    });
  });
});
