import { prisma } from "@/lib/prisma";
import { getCategoryLabel } from "@/lib/categories";
import { emailAdapter as defaultEmailAdapter } from "@/lib/email";
import type { EmailAdapter, EmailMessage } from "@/lib/email-adapter";
import { CommentInteractionType, INTERACTION_COPY } from "@/lib/types";

export type NotificationDeps = {
  emailAdapter: EmailAdapter;
};

/**
 * Resolve all recipient emails except the actor.
 * Returns an empty array (not undefined) when there are no recipients.
 */
async function getRecipientsExceptActor(actorId: string): Promise<string[]> {
  const recipients = await prisma.user.findMany({
    where: { id: { not: actorId } },
    select: { email: true },
  });
  return recipients.map((r) => r.email);
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

/**
 * Builds the notification functions around the given delivery adapters.
 * Production code uses the default instance exported below; tests inject
 * an InMemoryEmailAdapter.
 */
export function createNotifications({ emailAdapter }: NotificationDeps) {
  /**
   * Send an email, catching and logging errors so they never propagate to callers.
   */
  async function sendNotification(params: EmailMessage & { errorContext: string }): Promise<void> {
    const { errorContext, ...email } = params;
    try {
      await emailAdapter.send(email);
    } catch (err) {
      console.error(`Notification email failed (${errorContext}):`, err);
    }
  }

  /**
   * Send a task-change notification to all users except the actor.
   *
   * Fire-and-forget: resolves once recipients are resolved and the send has
   * been *initiated*, not once the email is delivered. Send errors are logged.
   *
   * @param action — action label (e.g. "Създадена", "Актуализирана")
   * @param category — Category slug (e.g. "golf-clubs")
   */
  async function notifyTaskChange({
    actorId,
    action,
    category,
  }: {
    actorId: string;
    action: string;
    category: string;
  }): Promise<void> {
    const emailList = await getRecipientsExceptActor(actorId);
    if (emailList.length === 0) return;

    void sendNotification({
      to: emailList,
      subject: "Известие за задача",
      html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; background-color: #f9f9f9;">
          <h3 style="color: #CDA349;">${escapeHtml(action)} задача в категория: ${escapeHtml(categoryLabelOrSlug(category))}</h3>
          <p style="font-size: 12px; color: #888; border-top: 1px solid #eee;">
          Това е автоматично системно известие.
        </p>
      </div>
    `,
      errorContext: `task-change (${category})`,
    });
  }

  /**
   * Send a comment/reply/reaction notification to all users except the actor.
   * Awaited end-to-end; send errors are logged, not thrown. Names and titles
   * are escaped in the body; the subject is plain text and needs no escaping.
   *
   * @param category — Category slug
   * @param type — comment | reply | reaction
   */
  async function notifyComment({
    actorId,
    actorName,
    taskTitle,
    category,
    type,
  }: {
    actorId: string;
    actorName: string;
    taskTitle: string;
    category: string;
    type: CommentInteractionType;
  }): Promise<void> {
    const emailList = await getRecipientsExceptActor(actorId);
    if (emailList.length === 0) return;

    const copy = INTERACTION_COPY[type];
    await sendNotification({
      to: emailList,
      subject: `${copy.subjectVerb}: ${taskTitle}`,
      html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
            <h3 style="color: #CDA349; margin-top: 0;">AVEXIM Платформа</h3>
            <p style="font-size: 15px; color: #333;">
              Потребителят <strong>${escapeHtml(actorName)}</strong> ${copy.bodyVerb}:
              <strong>${escapeHtml(taskTitle)}</strong> в категория <span style="color: #CDA349; font-weight: bold;">${escapeHtml(categoryLabelOrSlug(category))}</span>.
            </p>

            <p style="font-size: 12px; color: #888; border-top: 1px solid #eee;">
              Това е автоматично системно известие.
            </p>
          </div>
        `,
      errorContext: `comment (${type})`,
    });
  }

  return { notifyTaskChange, notifyComment };
}

export const { notifyTaskChange, notifyComment } = createNotifications({
  emailAdapter: defaultEmailAdapter,
});
