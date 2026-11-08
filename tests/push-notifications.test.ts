import { beforeEach, describe, expect, it } from "vitest";
import { createAuth } from "@/lib/auth";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { InMemoryPushAdapter } from "@/lib/push-adapter";
import { createNotifications, type Notifications } from "@/lib/notifications";
import { createTasks } from "@/lib/tasks";
import { createComments } from "@/lib/comments";
import type { Actor } from "@/lib/actor";
import { activity } from "@/lib/activity";
import { createSession, createUser } from "./support/fixtures";
import { sessionFrom } from "./support/auth";

const MONDAY_8AM = new Date("2026-11-02T08:00:00Z");
const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MONDAY_10AM = new Date("2026-11-02T10:00:00Z");
const MONDAY_11AM = new Date("2026-11-02T11:00:00Z");

/** The keys a browser hands over with its push subscription. */
const KEYS = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};

/**
 * Push or email: each recipient of a Notification gets it by push on every
 * device where they turned notifications on, or by email when they have
 * none. Observed through the in-memory EmailAdapter and PushAdapter.
 */
describe("Push notifications", () => {
  let emails: InMemoryEmailAdapter;
  let pushes: InMemoryPushAdapter;
  let notifications: Notifications;
  let tasks: ReturnType<typeof createTasks>;
  let comments: ReturnType<typeof createComments>;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    pushes = new InMemoryPushAdapter();
    notifications = createNotifications({ emailAdapter: emails, pushAdapter: pushes });
    tasks = createTasks({ notifications });
    comments = createComments({ notifications });
  });

  /** Everyone each email went to, one sorted list per email. */
  function emailed() {
    return emails.sent.map((email) => email.to.toSorted());
  }

  /** The devices pushed to, sorted. */
  function pushedTo() {
    return pushes.sent.map((push) => push.to.endpoint).toSorted();
  }

  function forget() {
    emails.sent.length = 0;
    pushes.sent.length = 0;
  }

  /** Turns notifications on in a new browser `user` signs in to; its endpoint. */
  async function turnOnPush(user: Actor, browser: string) {
    const session = await createSession(user);
    const endpoint = `https://fcm.googleapis.com/fcm/send/${browser}`;
    const result = await notifications.registerDevice(user, {
      sessionId: session.id,
      endpoint,
      keys: KEYS,
      now: MONDAY_8AM,
    });
    expect(result).toEqual({ ok: true });
    return endpoint;
  }

  /** Posts a Task as `owner`, then forgets what that sent. */
  async function postTask(owner: Actor, title = "Нова винена листа") {
    const result = await tasks.create(owner, {
      title,
      description: "Да се обнови до петък",
      category: "golf-clubs",
      fileIds: [],
      now: MONDAY_9AM,
    });
    if (!result.ok) throw new Error(`Could not post a Task: ${JSON.stringify(result.errors)}`);
    forget();
    return result.task;
  }

  /** Posts a Comment, or a Reply to `replyToId`, then forgets what that sent. */
  async function post(author: Actor, taskId: string, text: string, replyToId?: string) {
    const result = await comments.post(author, { taskId, text, replyToId, now: MONDAY_10AM });
    if (!result.ok) throw new Error(`Could not post a Comment: ${result.error}`);
    forget();
    return result.comment;
  }

  describe("push or email", () => {
    it("when Maria comments, Ivan, who turned push on, gets a push and no email; Georgi, who didn't, gets the email", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await createUser("Georgi");
      const ivansPhone = await turnOnPush(ivan, "ivans-phone");
      const task = await postTask(ivan);

      await comments.post(maria, { taskId: task.id, text: "Ще го направя днес", now: MONDAY_10AM });

      expect(emailed()).toEqual([["georgi@avexim.test"]]);
      expect(pushes.sent).toEqual([
        {
          to: { endpoint: ivansPhone, keys: KEYS },
          notification: {
            title: "Maria коментира",
            body: "Нова винена листа\nЩе го направя днес",
            url: `/tasks/${task.id}`,
          },
          unread: 1,
        },
      ]);
    });

    it("pushes to every device where the person turned notifications on", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const phone = await turnOnPush(ivan, "ivans-phone");
      const laptop = await turnOnPush(ivan, "ivans-laptop");

      await postTask(maria);
      await tasks.create(maria, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_10AM,
      });

      expect(pushedTo()).toEqual([laptop, phone].toSorted());
      expect(emails.sent).toEqual([]);
    });

    it("sends no email at all when everyone it concerns has push on", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await turnOnPush(ivan, "ivans-phone");
      const task = await postTask(ivan);

      await tasks.setDone(maria, { taskId: task.id, isDone: true, now: MONDAY_10AM });

      expect(emails.sent).toEqual([]);
      expect(pushes.sent.map((push) => push.notification)).toEqual([
        {
          title: "Maria отбеляза задача като завършена",
          body: "Нова винена листа",
          url: `/tasks/${task.id}`,
        },
      ]);
    });

    it("never pushes to the Actor's own devices", async () => {
      const ivan = await createUser("Ivan");
      await createUser("Maria");
      await turnOnPush(ivan, "ivans-phone");

      await postTask(ivan);
      await tasks.create(ivan, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_10AM,
      });

      expect(pushes.sent).toEqual([]);
      expect(emailed()).toEqual([["maria@avexim.test"]]);
    });
  });

  describe("what a push says", () => {
    it("a Reply: who replied, the Task title and the start of the Reply", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await turnOnPush(maria, "marias-phone");
      const task = await postTask(ivan);
      const mariasComment = await post(maria, task.id, "Кой ще поеме това?");

      await comments.post(ivan, {
        taskId: task.id,
        text: "Аз, още днес",
        replyToId: mariasComment.id,
        now: MONDAY_11AM,
      });

      expect(pushes.sent.map((push) => push.notification)).toEqual([
        { title: "Ivan отговори", body: "Нова винена листа\nАз, още днес", url: `/tasks/${task.id}` },
      ]);
    });

    it("a Reaction: who reacted with what, the Task title and the start of the Comment", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await turnOnPush(ivan, "ivans-phone");
      const task = await postTask(ivan);
      const ivansComment = await post(ivan, task.id, "Готово е");

      await comments.react(maria, { commentId: ivansComment.id, emoji: "👍" });

      expect(pushes.sent.map((push) => push.notification)).toEqual([
        { title: "Maria реагира 👍", body: "Нова винена листа\nГотово е", url: `/tasks/${task.id}` },
      ]);
    });

    it("shows only the start of a long comment", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await turnOnPush(ivan, "ivans-phone");
      const task = await postTask(ivan);
      const longText = "Много дълъг коментар ".repeat(20);

      await comments.post(maria, { taskId: task.id, text: longText, now: MONDAY_10AM });

      const [body] = pushes.sent.map((push) => push.notification.body);
      const shown = body.split("\n")[1];
      expect(shown.endsWith("…")).toBe(true);
      expect(shown.length).toBeLessThan(longText.length);
      expect(longText.startsWith(shown.slice(0, -1))).toBe(true);
    });

    it("a created and an edited Task open the Task; a deleted Task opens the Feed", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await turnOnPush(ivan, "ivans-phone");

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
      await tasks.delete(maria, { taskId: created.task.id, now: MONDAY_11AM });

      expect(pushes.sent.map((push) => push.notification)).toEqual([
        { title: "Maria създаде задача", body: "Инвентаризация", url: `/tasks/${created.task.id}` },
        { title: "Maria редактира задача", body: "Инвентаризация на склада", url: `/tasks/${created.task.id}` },
        { title: "Maria изтри задача", body: "Инвентаризация на склада", url: "/" },
      ]);
    });
  });

  describe("the badge on the app's icon", () => {
    it("each push carries the person's Unread count, so the icon can show it", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      await turnOnPush(ivan, "ivans-phone");
      await turnOnPush(georgi, "georgis-phone");
      const task = await postTask(ivan);
      await post(maria, task.id, "Първи");

      // Georgi has seen the Feed since; Ivan hasn't.
      await activity.markFeedSeen(georgi, { now: MONDAY_10AM });
      await comments.post(maria, { taskId: task.id, text: "Втори", now: MONDAY_11AM });

      const unreadOf = (endpointEnd: string) =>
        pushes.sent.find((push) => push.to.endpoint.endsWith(endpointEnd))?.unread;
      // Ivan: both of Maria's Comments. His own Task isn't news to him.
      expect(unreadOf("ivans-phone")).toBe(2);
      // Georgi: Ivan's Task and Maria's first Comment were seen; the second is new.
      expect(unreadOf("georgis-phone")).toBe(1);
    });

    it("a Reaction isn't an Activity, so it pushes the count as it was", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      await turnOnPush(ivan, "ivans-phone");
      const task = await postTask(ivan);
      const ivansComment = await post(ivan, task.id, "Готово е");

      await comments.react(maria, { commentId: ivansComment.id, emoji: "👍" });

      expect(pushes.sent.map((push) => push.unread)).toEqual([0]);
    });
  });

  describe("devices that stop working", () => {
    it("a device the push service rejects is dropped, and the person gets email again from the next Notification", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const phone = await turnOnPush(ivan, "ivans-phone");
      const task = await postTask(ivan);
      pushes.expire(phone);

      await comments.post(maria, { taskId: task.id, text: "Първи", now: MONDAY_10AM });
      await comments.post(maria, { taskId: task.id, text: "Втори", now: MONDAY_11AM });

      expect(pushes.sent).toEqual([]);
      expect(emailed()).toEqual([["ivan@avexim.test"]]);
      expect(emails.sent[0].subject).toBe("Нов коментар: Нова винена листа");
    });

    it("while another device still works, the person keeps getting push there and no email", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const phone = await turnOnPush(ivan, "ivans-phone");
      const laptop = await turnOnPush(ivan, "ivans-laptop");
      const task = await postTask(ivan);
      pushes.expire(phone);

      await comments.post(maria, { taskId: task.id, text: "Първи", now: MONDAY_10AM });
      await comments.post(maria, { taskId: task.id, text: "Втори", now: MONDAY_11AM });

      expect(pushedTo()).toEqual([laptop, laptop]);
      expect(emails.sent).toEqual([]);
    });
  });

  describe("turning notifications on and off", () => {
    it("turning them off on the only device brings email back", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const phone = await turnOnPush(ivan, "ivans-phone");

      await notifications.unregisterDevice(ivan, phone);
      await postTask(maria);
      await tasks.create(maria, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_10AM,
      });

      expect(pushes.sent).toEqual([]);
      expect(emailed()).toEqual([["ivan@avexim.test"]]);
    });

    it("nobody can turn off someone else's device", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const phone = await turnOnPush(ivan, "ivans-phone");

      await notifications.unregisterDevice(maria, phone);
      const task = await postTask(ivan);
      await comments.post(maria, { taskId: task.id, text: "Ще го направя днес", now: MONDAY_10AM });

      expect(pushedTo()).toEqual([phone]);
    });

    it("a browser someone else turns notifications on in becomes theirs", async () => {
      const ivan = await createUser("Ivan");
      const maria = await createUser("Maria");
      const georgi = await createUser("Georgi");
      const sharedTablet = await turnOnPush(ivan, "shared-tablet");
      const mariasSession = await createSession(maria);

      await notifications.registerDevice(maria, {
        sessionId: mariasSession.id,
        endpoint: sharedTablet,
        keys: KEYS,
        now: MONDAY_9AM,
      });
      await tasks.create(georgi, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_10AM,
      });

      expect(pushedTo()).toEqual([sharedTablet]);
      expect(emailed()).toEqual([["ivan@avexim.test"]]);
      expect(await notifications.sessionEndpoints(maria, mariasSession.id)).toEqual([sharedTablet]);
    });

    it("tells which devices were turned on in a session", async () => {
      const ivan = await createUser("Ivan");
      const phoneSession = await createSession(ivan);
      const laptopSession = await createSession(ivan);
      await notifications.registerDevice(ivan, {
        sessionId: phoneSession.id,
        endpoint: "https://fcm.googleapis.com/fcm/send/ivans-phone",
        keys: KEYS,
        now: MONDAY_8AM,
      });

      expect(await notifications.sessionEndpoints(ivan, phoneSession.id)).toEqual([
        "https://fcm.googleapis.com/fcm/send/ivans-phone",
      ]);
      expect(await notifications.sessionEndpoints(ivan, laptopSession.id)).toEqual([]);
    });

    it.each([
      ["Chrome and Edge on Android", "https://fcm.googleapis.com/fcm/send/abc"],
      ["Firefox", "https://updates.push.services.mozilla.com/wpush/v2/abc"],
      ["Safari and iPhone", "https://web.push.apple.com/abc"],
      ["Edge on Windows", "https://wns2-par02p.notify.windows.com/w/?token=abc"],
    ])("accepts the push service of %s", async (_, endpoint) => {
      const ivan = await createUser("Ivan");
      const session = await createSession(ivan);

      const result = await notifications.registerDevice(ivan, {
        sessionId: session.id,
        endpoint,
        keys: KEYS,
        now: MONDAY_8AM,
      });

      expect(result).toEqual({ ok: true });
      expect(await notifications.sessionEndpoints(ivan, session.id)).toEqual([endpoint]);
    });

    it.each([
      ["an endpoint that isn't https", { endpoint: "http://fcm.googleapis.com/fcm/send/x", keys: KEYS }],
      ["an endpoint that isn't a URL", { endpoint: "not a url", keys: KEYS }],
      ["a too long endpoint", { endpoint: `https://fcm.googleapis.com/fcm/send/${"x".repeat(800)}`, keys: KEYS }],
      ["missing keys", { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "", auth: "" } }],
      ["an endpoint on a server that isn't a push service", { endpoint: "https://intranet.avexim.test/x", keys: KEYS }],
      [
        "an endpoint only posing as a push service",
        { endpoint: "https://fcm.googleapis.com.evil.test/x", keys: KEYS },
      ],
    ])("refuses %s", async (_, subscription) => {
      const ivan = await createUser("Ivan");
      const session = await createSession(ivan);

      const result = await notifications.registerDevice(ivan, {
        sessionId: session.id,
        ...subscription,
        now: MONDAY_8AM,
      });

      expect(result).toEqual({ ok: false, error: expect.any(String) });
      expect(await notifications.sessionEndpoints(ivan, session.id)).toEqual([]);
    });
  });

  describe("signing out", () => {
    it("signing out of the browser where push was on brings email back", async () => {
      const auth = createAuth({ emailAdapter: new InMemoryEmailAdapter() });
      await auth.api.signUpEmail({
        body: { name: "Ivan", email: "ivan@avexim.test", password: "Staro!123" },
      });
      const maria = await createUser("Maria");
      const { headers: signedIn } = await auth.api.signInEmail({
        body: { email: "ivan@avexim.test", password: "Staro!123" },
        returnHeaders: true,
      });
      const browser = sessionFrom(signedIn);
      const session = await auth.api.getSession({ headers: browser });
      if (!session) throw new Error("Ivan is not signed in");
      const ivan = { id: session.user.id, name: session.user.name };
      const turnedOn = await notifications.registerDevice(ivan, {
        sessionId: session.session.id,
        endpoint: "https://fcm.googleapis.com/fcm/send/ivans-phone",
        keys: KEYS,
        now: MONDAY_8AM,
      });
      expect(turnedOn).toEqual({ ok: true });
      expect(await notifications.sessionEndpoints(ivan, session.session.id)).toEqual([
        "https://fcm.googleapis.com/fcm/send/ivans-phone",
      ]);

      await auth.api.signOut({ headers: browser });
      await tasks.create(maria, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_10AM,
      });

      expect(pushes.sent).toEqual([]);
      expect(emailed()).toEqual([["ivan@avexim.test"]]);
    });
  });

  describe("changing the password", () => {
    it("keeps push on the device it was changed on, and brings email back on the others", async () => {
      const auth = createAuth({ emailAdapter: new InMemoryEmailAdapter() });
      await auth.api.signUpEmail({
        body: { name: "Ivan", email: "ivan@avexim.test", password: "Staro!123" },
      });
      const maria = await createUser("Maria");

      /** Ivan signs in on a device and turns push on there; its headers and session. */
      async function onDevice(name: string) {
        const { headers: signedIn } = await auth.api.signInEmail({
          body: { email: "ivan@avexim.test", password: "Staro!123" },
          returnHeaders: true,
        });
        const device = sessionFrom(signedIn);
        const session = await auth.api.getSession({ headers: device });
        if (!session) throw new Error("Ivan is not signed in");
        const ivan = { id: session.user.id, name: session.user.name };
        await notifications.registerDevice(ivan, {
          sessionId: session.session.id,
          endpoint: `https://fcm.googleapis.com/fcm/send/ivans-${name}`,
          keys: KEYS,
          now: MONDAY_8AM,
        });
        return { device, ivan, sessionId: session.session.id };
      }
      const phone = await onDevice("phone");
      const laptop = await onDevice("laptop");

      await auth.api.changePassword({
        headers: phone.device,
        body: { currentPassword: "Staro!123", newPassword: "Novo!1234" },
      });
      await tasks.create(maria, {
        title: "Инвентаризация",
        description: "До края на месеца",
        category: "warehouse",
        fileIds: [],
        now: MONDAY_10AM,
      });

      expect(await auth.api.getSession({ headers: phone.device })).not.toBeNull();
      expect(await auth.api.getSession({ headers: laptop.device })).toBeNull();
      expect(await notifications.sessionEndpoints(phone.ivan, phone.sessionId)).toEqual([
        "https://fcm.googleapis.com/fcm/send/ivans-phone",
      ]);
      expect(pushedTo()).toEqual(["https://fcm.googleapis.com/fcm/send/ivans-phone"]);
      expect(emailed()).toEqual([]);
    });
  });
});
