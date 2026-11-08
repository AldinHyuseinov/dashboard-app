import z from "zod";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { excerpt } from "@/lib/activity";
import { categoryLabelOrSlug } from "@/lib/categories";
import { emailAdapter as defaultEmailAdapter } from "@/lib/email";
import type { EmailAdapter, EmailMessage } from "@/lib/email-adapter";
import { openTaskHref } from "@/lib/navigation";
import { pushAdapter as defaultPushAdapter } from "@/lib/push";
import {
  PushDeviceGone,
  type PushAdapter,
  type PushMessage,
  type PushNotification,
  type PushTarget,
} from "@/lib/push-adapter";

export type NotificationDeps = {
  emailAdapter: EmailAdapter;
  pushAdapter: PushAdapter;
};

/** The Task an action concerns: what a Notification names, and its Task Owner's `userId`. */
export type NotifiedTask = { id: string; title: string; category: string; userId: string };

/** The Actor's action a Notification tells about: an Activity, or adding a Reaction. */
export type NotifiedAction =
  | { type: "task-created" | "task-edited" | "task-deleted"; task: NotifiedTask }
  | { type: "task-done" | "task-not-done"; task: NotifiedTask }
  | { type: "comment-posted"; task: NotifiedTask; commentText: string }
  | { type: "reply-posted"; task: NotifiedTask; commentText: string; answeredAuthorId: string }
  | {
      type: "reaction-added";
      task: NotifiedTask;
      /** The text of the Comment reacted to. */
      commentText: string;
      emoji: string;
      commentAuthorId: string;
    };

/** Who an action concerns before the Actor is excluded: everyone, or these users' ids. */
type Recipients = "everyone" | string[];

/** The Recipient rules: who is told about each action. The Actor is removed later. */
function recipientsFor(action: NotifiedAction): Recipients {
  switch (action.type) {
    case "task-created":
    case "task-edited":
    case "task-deleted":
    case "comment-posted":
      return "everyone";
    case "reply-posted":
      return [action.answeredAuthorId, action.task.userId];
    case "task-done":
    case "task-not-done":
      return [action.task.userId];
    case "reaction-added":
      return [action.commentAuthorId];
  }
}

/**
 * How the recipients except the Actor are reached, each once: every push
 * device of those who have any, and the email addresses of those who don't.
 */
async function channelsFor(
  actor: Actor,
  recipients: Recipients,
): Promise<{ emails: string[]; devices: PushTarget[] }> {
  const users = await prisma.user.findMany({
    where: {
      id: recipients === "everyone" ? { not: actor.id } : { in: recipients, not: actor.id },
    },
    select: { email: true, pushDevices: { select: { endpoint: true, p256dh: true, auth: true } } },
  });
  return {
    emails: users.filter((user) => user.pushDevices.length === 0).map((user) => user.email),
    devices: users.flatMap((user) =>
      user.pushDevices.map(({ endpoint, p256dh, auth }) => ({ endpoint, keys: { p256dh, auth } })),
    ),
  };
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Text to place in an email's HTML, shown as written rather than read as markup. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** How a task-change email names what was done to the Task. */
const TASK_CHANGE_ACTIONS = {
  "task-created": "Създадена нова",
  "task-edited": "Обновена",
  "task-deleted": "Изтрита",
} as const;

/** How an email about something done on a Task names it, in its subject and body. */
const TASK_ACTION_COPY = {
  "comment-posted": { subjectVerb: "Нов коментар", bodyVerb: "написа нов коментар по задача" },
  "reply-posted": { subjectVerb: "Нов отговор", bodyVerb: "отговори на коментар по задача" },
  "reaction-added": { subjectVerb: "Нова реакция", bodyVerb: "реагира на коментар по задача" },
  "task-done": {
    subjectVerb: "Отбелязана като завършена",
    bodyVerb: "отбеляза като завършена задача",
  },
  "task-not-done": {
    subjectVerb: "Отбелязана като незавършена",
    bodyVerb: "отбеляза като незавършена задача",
  },
} as const;

/**
 * The email for an action. Names, Task titles and Category labels are escaped
 * in the body; the subject is plain text and needs no escaping.
 */
function emailFor(actor: Actor, action: NotifiedAction): { subject: string; html: string } {
  if (isTaskChange(action)) {
    return {
      subject: "Известие за задача",
      html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; background-color: #f9f9f9;">
          <h3 style="color: #CDA349;">${escapeHtml(TASK_CHANGE_ACTIONS[action.type])} задача в категория: ${escapeHtml(categoryLabelOrSlug(action.task.category))}</h3>
          <p style="font-size: 12px; color: #888; border-top: 1px solid #eee;">
          Това е автоматично системно известие.
        </p>
      </div>
    `,
    };
  }

  const copy = TASK_ACTION_COPY[action.type];
  const { title, category } = action.task;
  return {
    subject: `${copy.subjectVerb}: ${title}`,
    html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
            <h3 style="color: #CDA349; margin-top: 0;">AVEXIM Платформа</h3>
            <p style="font-size: 15px; color: #333;">
              Потребителят <strong>${escapeHtml(actor.name)}</strong> ${copy.bodyVerb}:
              <strong>${escapeHtml(title)}</strong> в категория <span style="color: #CDA349; font-weight: bold;">${escapeHtml(categoryLabelOrSlug(category))}</span>.
            </p>

            <p style="font-size: 12px; color: #888; border-top: 1px solid #eee;">
              Това е автоматично системно известие.
            </p>
          </div>
        `,
  };
}

function isTaskChange(
  action: NotifiedAction,
): action is Extract<NotifiedAction, { type: keyof typeof TASK_CHANGE_ACTIONS }> {
  return action.type in TASK_CHANGE_ACTIONS;
}

/** What a push says the Actor did, after their name. */
const PUSH_TITLE_VERBS = {
  "task-created": "създаде задача",
  "task-edited": "редактира задача",
  "task-deleted": "изтри задача",
  "task-done": "отбеляза задача като завършена",
  "task-not-done": "отбеляза задача като незавършена",
  "comment-posted": "коментира",
  "reply-posted": "отговори",
  "reaction-added": "реагира",
} as const satisfies Record<NotifiedAction["type"], string>;

/**
 * The push for an action: its title says who did what, its text gives the
 * Task title and the start of the Comment, and tapping it opens the Task, or
 * the Feed for a deleted Task. Shown as plain text, so nothing is escaped.
 */
function pushFor(actor: Actor, action: NotifiedAction): PushNotification {
  const did = PUSH_TITLE_VERBS[action.type];
  const what = action.type === "reaction-added" ? `${did} ${action.emoji}` : did;
  const comment = "commentText" in action ? `\n${excerpt(action.commentText)}` : "";
  return {
    title: `${actor.name} ${what}`,
    body: `${action.task.title}${comment}`,
    url: action.type === "task-deleted" ? "/" : openTaskHref(action.task.id),
  };
}

/**
 * The hosts of the browsers' push services: Chrome, Edge on Android, Opera
 * and Samsung Internet (Google), Firefox (Mozilla), Safari and iPhone
 * (Apple), and Edge on Windows (Microsoft). The server only ever sends to
 * these, never to a URL someone made up.
 */
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

/** A browser's push subscription, as it hands it over to turn notifications on. */
const deviceSchema = z.object({
  endpoint: z
    .url({ protocol: /^https$/, hostname: z.regexes.domain })
    .max(800)
    .refine((endpoint) => {
      // Runs even when the URL check above failed, so it mustn't throw.
      const host = URL.parse(endpoint)?.hostname ?? "";
      return PUSH_SERVICE_HOSTS.some((known) => known.test(host));
    }),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

const NOT_A_PUSH_SUBSCRIPTION = "Известията не могат да се включат в този браузър.";

/**
 * Builds the Notifications module around the given delivery adapters.
 * Production code uses the default instance exported below; tests inject
 * an InMemoryEmailAdapter and an InMemoryPushAdapter.
 */
export function createNotifications({ emailAdapter, pushAdapter }: NotificationDeps) {
  /**
   * Tells the people an action concerns about it, and never the Actor: by
   * push on every device where they turned notifications on, or by email if
   * they have none. Never throws: a failed recipient lookup or send is
   * logged, so it can't fail the change that was already saved.
   */
  async function notify(actor: Actor, action: NotifiedAction): Promise<void> {
    let channels;
    try {
      channels = await channelsFor(actor, recipientsFor(action));
    } catch (err) {
      console.error(`Notification failed (${action.type}):`, err);
      return;
    }
    const { emails, devices } = channels;
    const notification = pushFor(actor, action);
    await Promise.all([
      emails.length > 0 && sendEmail(action, { to: emails, ...emailFor(actor, action) }),
      ...devices.map((to) => push(action, { to, notification })),
    ]);
  }

  async function sendEmail(action: NotifiedAction, message: EmailMessage): Promise<void> {
    try {
      await emailAdapter.send(message);
    } catch (err) {
      console.error(`Notification email failed (${action.type}):`, err);
    }
  }

  /**
   * Pushes to one device. A device the push service refuses for good is
   * dropped, so its owner gets email again once they have no device left.
   */
  async function push(action: NotifiedAction, message: PushMessage): Promise<void> {
    try {
      await pushAdapter.send(message);
    } catch (err) {
      if (!(err instanceof PushDeviceGone)) {
        console.error(`Push failed (${action.type}):`, err);
        return;
      }
      try {
        await prisma.pushDevice.deleteMany({ where: { endpoint: err.endpoint } });
      } catch (deleteErr) {
        console.error("Could not drop a push device the push service refused:", deleteErr);
      }
    }
  }

  /**
   * Turns notifications on in the browser the Actor is signed in to with
   * `sessionId`, from the push subscription it handed over. A session has
   * one device, so a new subscription replaces its last one. A browser
   * someone else had turned on becomes the Actor's.
   */
  async function registerDevice(
    actor: Actor,
    input: PushTarget & { sessionId: string; now: Date },
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const device = deviceSchema.safeParse(input);
    if (!device.success) return { ok: false, error: NOT_A_PUSH_SUBSCRIPTION };

    const { endpoint, keys } = device.data;
    const registration = {
      userId: actor.id,
      sessionId: input.sessionId,
      ...keys,
      createdAt: input.now,
    };
    await prisma.$transaction([
      prisma.pushDevice.deleteMany({
        where: { sessionId: input.sessionId, endpoint: { not: endpoint } },
      }),
      prisma.pushDevice.upsert({
        where: { endpoint },
        create: { endpoint, ...registration },
        update: registration,
      }),
    ]);
    return { ok: true };
  }

  /** Turns notifications off on the Actor's device with `endpoint`; others' devices stay. */
  async function unregisterDevice(actor: Actor, endpoint: string): Promise<void> {
    await prisma.pushDevice.deleteMany({ where: { endpoint, userId: actor.id } });
  }

  /** The endpoints of the Actor's devices turned on while signed in with `sessionId`. */
  async function sessionEndpoints(actor: Actor, sessionId: string): Promise<string[]> {
    const devices = await prisma.pushDevice.findMany({
      where: { sessionId, userId: actor.id },
      select: { endpoint: true },
    });
    return devices.map((device) => device.endpoint);
  }

  return { notify, registerDevice, unregisterDevice, sessionEndpoints };
}

export type Notifications = ReturnType<typeof createNotifications>;

export const notifications = createNotifications({
  emailAdapter: defaultEmailAdapter,
  pushAdapter: defaultPushAdapter,
});
