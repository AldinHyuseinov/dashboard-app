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

describe("Comments", () => {
  let emails: InMemoryEmailAdapter;
  let tasks: ReturnType<typeof createTasks>;
  let comments: ReturnType<typeof createComments>;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    const notifications = createNotifications({ emailAdapter: emails });
    tasks = createTasks({ notifications });
    comments = createComments({ notifications });
  });

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

  describe("posting a Comment", () => {
    it("Maria comments on Ivan's Task; it shows on the Task and everyone else is emailed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);

      const result = await comments.post(maria, {
        taskId: task.id,
        text: "  Ще го направя днес  ",
        now: MONDAY_10AM,
      });

      expect(result).toMatchObject({
        ok: true,
        comment: { taskId: task.id, category: "golf-clubs" },
      });
      expect(await comments.list(maria, task.id)).toMatchObject([
        {
          text: "Ще го направя днес",
          userId: maria.id,
          user: { name: "Maria" },
          parentId: null,
          answersId: null,
          isPinned: false,
          createdAt: MONDAY_10AM,
          editedAt: null,
          reactions: [],
        },
      ]);
      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to.toSorted()).toEqual(["georgi@avexim.test", "ivan@avexim.test"]);
      expect(emails.sent[0].subject).toBe("Нов коментар: Нова винена листа");
      expect(emails.sent[0].html).toContain("Maria");
      expect(emails.sent[0].html).toContain("Голф Клубове");
    });

    it("is refused when the text is blank", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      const task = await postTask(ivan);

      const result = await comments.post(ivan, { taskId: task.id, text: "   ", now: MONDAY_10AM });

      expect(result).toEqual({ ok: false, error: "Коментарът не може да бъде празен." });
      expect(await comments.list(ivan, task.id)).toEqual([]);
      expect(emails.sent).toEqual([]);
    });

    it("is refused on a Task that doesn't exist", async () => {
      const ivan = await createUser("Ivan");

      const result = await comments.post(ivan, {
        taskId: "no-such-task",
        text: "Ехо?",
        now: MONDAY_10AM,
      });

      expect(result).toEqual({ ok: false, error: "Задачата не е намерена." });
    });
  });

  describe("posting a Reply", () => {
    it("Ivan replies to Maria's Comment; the Reply is filed under it and Maria is emailed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");

      const result = await comments.post(ivan, {
        taskId: task.id,
        text: "До петък",
        replyToId: comment.id,
        now: MONDAY_11AM,
      });

      expect(result.ok).toBe(true);
      const reply = (await comments.list(ivan, task.id)).find((c) => c.text === "До петък");
      expect(reply).toMatchObject({ parentId: comment.id, answersId: comment.id, userId: ivan.id });
      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to).toEqual(["maria@avexim.test"]);
      expect(emails.sent[0].subject).toBe("Нов отговор: Нова винена листа");
    });

    it("a Reply to a Reply is filed under the top-level Comment, but records the Reply it answers", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");
      const reply = await post(ivan, task.id, "До петък", comment.id);

      await comments.post(georgi, {
        taskId: task.id,
        text: "Аз ще помогна",
        replyToId: reply.id,
        now: MONDAY_11AM,
      });

      const answer = (await comments.list(georgi, task.id)).find((c) => c.text === "Аз ще помогна");
      expect(answer).toMatchObject({ parentId: comment.id, answersId: reply.id });
    });

    it("is refused when the answered Comment is on another Task, and nothing is posted (bug 2)", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const wineList = await postTask(ivan, "Нова винена листа");
      const inventory = await postTask(ivan, "Инвентаризация");
      const comment = await post(maria, wineList.id, "Кога е срокът?");

      const result = await comments.post(ivan, {
        taskId: inventory.id,
        text: "До петък",
        replyToId: comment.id,
        now: MONDAY_11AM,
      });

      expect(result).toEqual({
        ok: false,
        error: "Може да се отговаря само на коментари по същата задача.",
      });
      expect(await comments.list(ivan, inventory.id)).toEqual([]);
      expect(await comments.list(ivan, wineList.id)).toHaveLength(1);
      expect(emails.sent).toEqual([]);
    });

    it("is refused when the answered Comment doesn't exist", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan);

      const result = await comments.post(ivan, {
        taskId: task.id,
        text: "До петък",
        replyToId: "no-such-comment",
        now: MONDAY_11AM,
      });

      expect(result).toEqual({ ok: false, error: "Коментарът не е намерен." });
      expect(await comments.list(ivan, task.id)).toEqual([]);
    });
  });

  describe("editing a Comment", () => {
    it("the author changes the text; it is marked edited and nobody is emailed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");

      const result = await comments.edit(maria, {
        commentId: comment.id,
        text: " Кога е крайният срок? ",
        now: MONDAY_11AM,
      });

      expect(result).toEqual({ ok: true, comment });
      expect(await comments.list(maria, task.id)).toMatchObject([
        { text: "Кога е крайният срок?", editedAt: MONDAY_11AM },
      ]);
      expect(emails.sent).toEqual([]);
    });

    it("is refused to anyone but the author, and the text stays as it was", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");

      const result = await comments.edit(ivan, {
        commentId: comment.id,
        text: "Подправено",
        now: MONDAY_11AM,
      });

      expect(result).toEqual({ ok: false, error: "Само авторът може да редактира коментара." });
      expect(await comments.list(ivan, task.id)).toMatchObject([
        { text: "Кога е срокът?", editedAt: null },
      ]);
    });

    it("is refused when the new text is blank", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan);
      const comment = await post(ivan, task.id, "Кога е срокът?");

      const result = await comments.edit(ivan, {
        commentId: comment.id,
        text: "",
        now: MONDAY_11AM,
      });

      expect(result).toEqual({ ok: false, error: "Коментарът не може да бъде празен." });
      expect(await comments.list(ivan, task.id)).toMatchObject([{ text: "Кога е срокът?" }]);
    });

    it("is refused when the Comment doesn't exist", async () => {
      const ivan = await createUser("Ivan");

      const result = await comments.edit(ivan, {
        commentId: "no-such-comment",
        text: "Ехо",
        now: MONDAY_11AM,
      });

      expect(result).toEqual({ ok: false, error: "Коментарът не е намерен." });
    });
  });

  describe("deleting a Comment", () => {
    it("the author deletes a top-level Comment, and its Replies, including Replies to Replies, go with it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");
      const reply = await post(ivan, task.id, "До петък", comment.id);
      await post(maria, task.id, "Благодаря", reply.id);
      await comments.react(maria, { commentId: reply.id, emoji: "👍" });
      await post(ivan, task.id, "Друга тема");

      const result = await comments.delete(maria, comment.id);

      expect(result).toEqual({ ok: true, comment });
      expect(await comments.list(ivan, task.id)).toMatchObject([{ text: "Друга тема" }]);
      expect(emails.sent).toEqual([]);
    });

    it("the author deletes a Reply, and the rest of the thread stays", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");
      const reply = await post(ivan, task.id, "До петък", comment.id);

      await comments.delete(ivan, reply.id);

      expect(await comments.list(ivan, task.id)).toMatchObject([{ text: "Кога е срокът?" }]);
    });

    it("deleting a Reply that others answered makes their Replies answer the top-level Comment", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");
      const reply = await post(ivan, task.id, "До петък", comment.id);
      await post(georgi, task.id, "Аз ще помогна", reply.id);
      await post(maria, task.id, "Чудесно", reply.id);

      const result = await comments.delete(ivan, reply.id);

      expect(result.ok).toBe(true);
      const remaining = await comments.list(ivan, task.id);
      expect(remaining).toHaveLength(3);
      expect(remaining.find((c) => c.text === "Аз ще помогна")).toMatchObject({
        parentId: comment.id,
        answersId: comment.id,
      });
      expect(remaining.find((c) => c.text === "Чудесно")).toMatchObject({
        parentId: comment.id,
        answersId: comment.id,
      });
    });

    it("is refused to anyone but the author, even the Task Owner", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");

      const result = await comments.delete(ivan, comment.id);

      expect(result).toEqual({ ok: false, error: "Само авторът може да изтрие коментара." });
      expect(await comments.list(ivan, task.id)).toHaveLength(1);
    });

    it("is refused when the Comment doesn't exist", async () => {
      const ivan = await createUser("Ivan");

      expect(await comments.delete(ivan, "no-such-comment")).toEqual({
        ok: false,
        error: "Коментарът не е намерен.",
      });
    });
  });

  describe("pinning a Comment", () => {
    /** Each Comment's text and whether it is pinned, in posting order. */
    async function pinStates(actor: Actor, taskId: string) {
      return (await comments.list(actor, taskId)).map((c) => [c.text, c.isPinned]);
    }

    it("the Task Owner pins a Comment, and nobody is emailed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");

      const result = await comments.pin(ivan, comment.id);

      expect(result).toEqual({ ok: true, comment });
      expect(await pinStates(ivan, task.id)).toEqual([["Кога е срокът?", true]]);
      expect(emails.sent).toEqual([]);
    });

    it("pinning the Pinned Comment again unpins it", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan);
      const comment = await post(ivan, task.id, "Важно");
      await comments.pin(ivan, comment.id);

      await comments.pin(ivan, comment.id);

      expect(await pinStates(ivan, task.id)).toEqual([["Важно", false]]);
    });

    it("pinning another Comment unpins the first, so a Task has at most one Pinned Comment", async () => {
      const ivan = await createUser("Ivan");
      const task = await postTask(ivan);
      const first = await post(ivan, task.id, "Първи");
      const second = await post(ivan, task.id, "Втори");
      await comments.pin(ivan, first.id);

      await comments.pin(ivan, second.id);

      expect(await pinStates(ivan, task.id)).toEqual([
        ["Първи", false],
        ["Втори", true],
      ]);
    });

    it("pinning on one Task leaves another Task's Pinned Comment alone", async () => {
      const ivan = await createUser("Ivan");
      const wineList = await postTask(ivan, "Нова винена листа");
      const inventory = await postTask(ivan, "Инвентаризация");
      const onWineList = await post(ivan, wineList.id, "Листа");
      const onInventory = await post(ivan, inventory.id, "Склад");
      await comments.pin(ivan, onWineList.id);

      await comments.pin(ivan, onInventory.id);

      expect(await pinStates(ivan, wineList.id)).toEqual([["Листа", true]]);
    });

    it("is refused to anyone but the Task Owner, even the Comment's author", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");

      const result = await comments.pin(maria, comment.id);

      expect(result).toEqual({
        ok: false,
        error: "Само собственикът на задачата може да закача коментари.",
      });
      expect(await pinStates(ivan, task.id)).toEqual([["Кога е срокът?", false]]);
    });

    it("is refused for a Reply, even to the Task Owner (bug 3)", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(maria, task.id, "Кога е срокът?");
      const reply = await post(maria, task.id, "Спешно е", comment.id);
      await comments.pin(ivan, comment.id);

      const result = await comments.pin(ivan, reply.id);

      expect(result).toEqual({ ok: false, error: "Отговорите не могат да бъдат закачани." });
      expect(await pinStates(ivan, task.id)).toEqual([
        ["Кога е срокът?", true],
        ["Спешно е", false],
      ]);
    });

    it("is refused when the Comment doesn't exist", async () => {
      const ivan = await createUser("Ivan");

      expect(await comments.pin(ivan, "no-such-comment")).toEqual({
        ok: false,
        error: "Коментарът не е намерен.",
      });
    });
  });

  describe("reacting to a Comment", () => {
    it("Maria reacts to Ivan's Comment; the Reaction shows and Ivan is emailed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const task = await postTask(ivan);
      const comment = await post(ivan, task.id, "Готово е");

      const result = await comments.react(maria, { commentId: comment.id, emoji: "👏" });

      expect(result).toEqual({ ok: true, comment });
      expect(await comments.list(ivan, task.id)).toMatchObject([
        { reactions: [{ emoji: "👏", userId: maria.id, user: { name: "Maria" } }] },
      ]);
      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0].to).toEqual(["ivan@avexim.test"]);
      expect(emails.sent[0].subject).toBe("Нова реакция: Нова винена листа");
    });

    it("reacting again with the same emoji removes the Reaction, and nobody is emailed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(ivan, task.id, "Готово е");
      await comments.react(maria, { commentId: comment.id, emoji: "👏" });
      emails.sent.length = 0;

      const result = await comments.react(maria, { commentId: comment.id, emoji: "👏" });

      expect(result).toEqual({ ok: true, comment });
      expect(await comments.list(ivan, task.id)).toMatchObject([{ reactions: [] }]);
      expect(emails.sent).toEqual([]);
    });

    it("one person may add several different emojis to the same Comment", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(ivan, task.id, "Готово е");

      await comments.react(maria, { commentId: comment.id, emoji: "❤️" });
      await comments.react(maria, { commentId: comment.id, emoji: "👍" });

      const [listed] = await comments.list(ivan, task.id);
      expect(listed.reactions.map((r) => r.emoji).toSorted()).toEqual(["❤️", "👍"].toSorted());
    });

    it.each(["❤️", "🤣", "😮", "😥", "😡", "👍", "👎", "👏"])(
      "accepts %s, one of the emojis the UI offers",
      async (emoji) => {
        const ivan = await createUser("Ivan");
        const task = await postTask(ivan);
        const comment = await post(ivan, task.id, "Готово е");

        expect(await comments.react(ivan, { commentId: comment.id, emoji })).toMatchObject({
          ok: true,
        });
        expect(await comments.list(ivan, task.id)).toMatchObject([{ reactions: [{ emoji }] }]);
      },
    );

    it.each([
      ["an emoji the UI doesn't offer", "🍕"],
      ["arbitrary text", "<b>харесвам</b>"],
      ["an empty string", ""],
    ])("refuses %s, storing nothing and emailing nobody (bug 13)", async (_, emoji) => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const task = await postTask(ivan);
      const comment = await post(ivan, task.id, "Готово е");

      const result = await comments.react(maria, { commentId: comment.id, emoji });

      expect(result).toEqual({ ok: false, error: "Тази реакция не е позволена." });
      expect(await comments.list(ivan, task.id)).toMatchObject([{ reactions: [] }]);
      expect(emails.sent).toEqual([]);
    });

    it("is refused with a clear error when the Comment doesn't exist", async () => {
      const ivan = await createUser("Ivan");

      const result = await comments.react(ivan, { commentId: "no-such-comment", emoji: "👍" });

      expect(result).toEqual({ ok: false, error: "Коментарът не е намерен." });
    });
  });

  describe("notification emails", () => {
    type Interaction = (mallory: Actor, taskId: string, ivansCommentId: string) => Promise<unknown>;
    const interactions: [string, string, Interaction][] = [
      [
        "Comment",
        "Нов коментар",
        (mallory, taskId) => comments.post(mallory, { taskId, text: "Здравей", now: MONDAY_11AM }),
      ],
      [
        "Reply",
        "Нов отговор",
        (mallory, taskId, replyToId) =>
          comments.post(mallory, { taskId, text: "Здравей", replyToId, now: MONDAY_11AM }),
      ],
      [
        "Reaction",
        "Нова реакция",
        (mallory, _, commentId) => comments.react(mallory, { commentId, emoji: "👍" }),
      ],
    ];

    it.each(interactions)(
      "a %s email shows names and the Task title as plain text, not HTML (bug 6)",
      async (_, subject, interact) => {
        const ivan = await createUser("Ivan");
        const mallory = await createUser(
          '<a href="https://evil.test">Мария</a>',
          "mallory@avexim.test",
        );
        const task = await postTask(ivan, "<img src=x onerror=alert(1)>Листа & цени");
        const ivansComment = await post(ivan, task.id, "Готово е");

        await interact(mallory, task.id, ivansComment.id);

        expect(emails.sent).toHaveLength(1);
        const [email] = emails.sent;
        expect(email.subject).toBe(`${subject}: <img src=x onerror=alert(1)>Листа & цени`);
        expect(email.html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;Мария&lt;/a&gt;");
        expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;Листа &amp; цени");
        expect(email.html).not.toContain("<a ");
        expect(email.html).not.toContain("<img");
      },
    );
  });
});
