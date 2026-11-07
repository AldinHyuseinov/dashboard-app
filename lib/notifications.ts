import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/actor";
import { getCategoryLabel } from "@/lib/categories";
import { emailAdapter as defaultEmailAdapter } from "@/lib/email";
import type { EmailAdapter } from "@/lib/email-adapter";

export type NotificationDeps = {
  emailAdapter: EmailAdapter;
};

/** The Task an action concerns: what the email names, and its Task Owner's `userId`. */
export type NotifiedTask = { title: string; category: string; userId: string };

/** The Actor's action a Notification tells about: an Activity, or adding a Reaction. */
export type NotifiedAction =
  | { type: "task-created" | "task-edited" | "task-deleted"; category: string }
  | { type: "task-done" | "task-not-done"; task: NotifiedTask }
  | { type: "comment-posted"; task: NotifiedTask }
  | { type: "reply-posted"; task: NotifiedTask; answeredAuthorId: string }
  | { type: "reaction-added"; task: NotifiedTask; commentAuthorId: string };

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
 * The email addresses of the recipients except the Actor, each once. Empty,
 * not undefined, when nobody is left.
 */
async function recipientEmails(actor: Actor, recipients: Recipients): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: {
      id: recipients === "everyone" ? { not: actor.id } : { in: recipients, not: actor.id },
    },
    select: { email: true },
  });
  return users.map((user) => user.email);
}

/**
 * Category label for emails. Falls back to the stored value when it isn't a
 * Category, so a stray legacy value still produces a readable email.
 */
function categoryLabelOrSlug(category: string): string {
  return getCategoryLabel(category) ?? category;
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
  if (!("task" in action)) {
    return {
      subject: "Известие за задача",
      html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; background-color: #f9f9f9;">
          <h3 style="color: #CDA349;">${escapeHtml(TASK_CHANGE_ACTIONS[action.type])} задача в категория: ${escapeHtml(categoryLabelOrSlug(action.category))}</h3>
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

/**
 * Builds the Notifications module around the given delivery adapters.
 * Production code uses the default instance exported below; tests inject
 * an InMemoryEmailAdapter.
 */
export function createNotifications({ emailAdapter }: NotificationDeps) {
  /**
   * Tells the people an action concerns about it, by email, and never the
   * Actor. Never throws: a failed recipient lookup or send is logged, so it
   * can't fail the change that was already saved.
   */
  async function notify(actor: Actor, action: NotifiedAction): Promise<void> {
    try {
      const to = await recipientEmails(actor, recipientsFor(action));
      if (to.length === 0) return;
      await emailAdapter.send({ to, ...emailFor(actor, action) });
    } catch (err) {
      console.error(`Notification failed (${action.type}):`, err);
    }
  }

  return { notify };
}

export type Notifications = ReturnType<typeof createNotifications>;

export const notifications = createNotifications({ emailAdapter: defaultEmailAdapter });
