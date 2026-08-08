import { prisma } from "@/lib/prisma";
import { emailAdapter } from "@/lib/email";
import { CommentInteractionType, INTERACTION_COPY, navLinks } from "@/lib/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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
 * Resolve a human-readable category label from navLinks.
 * Falls back to the raw category string if no match is found.
 */
function getCategoryLabel(category: string): string {
  for (const link of navLinks) {
    if (link.href.replace("/", "") === category) return link.label;
    if (link.dropdown) {
      const subItem = link.dropdown.find((d) => d.href.replace("/", "") === category);
      if (subItem) return subItem.label;
    }
  }
  return category;
}

/**
 * Fire-and-forget email send with error logging.
 * Catches and logs errors so they never propagate to callers.
 *
 * NOTE: this is deliberately NOT awaited by callers that want
 * old "sendBulkNotification"-style fire-and-forget semantics
 * (see notifyTaskChange). It is still an async function so that
 * callers who *do* want to await full delivery (e.g. notifyComment,
 * notifyReaction) are able to.
 */
async function sendNotification(params: {
  to: string | string[];
  subject: string;
  html: string;
  errorContext?: string;
}): Promise<void> {
  try {
    await emailAdapter.send(params);
  } catch (err) {
    console.error(
      params.errorContext
        ? `Notification email failed (${params.errorContext}):`
        : "Notification email failed:",
      err,
    );
  }
}

/**
 * Resolve recipients and invoke sendFn with the list.
 * Early returns (silently) when there are no recipients.
 *
 * `errorContext` is threaded through to sendFn's own error handling
 * (each call site passes it again into `sendNotification`) — kept
 * here too so callers that need it for logging outside sendFn
 * (e.g. a future non-email notifyWithRecipients caller) have it
 * available without re-deriving it.
 */
async function notifyWithRecipients({
  actorId,
  sendFn,
}: {
  actorId: string;
  sendFn: (emailList: string[]) => Promise<void>;
  errorContext?: string;
}): Promise<void> {
  const emailList = await getRecipientsExceptActor(actorId);
  if (emailList.length === 0) return;
  await sendFn(emailList);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a task-change notification to all users except the actor.
 *
 * Fire-and-forget: matches the original `sendBulkNotification`
 * behavior, which used `void transporter.sendMail(...)` and did
 * not await delivery before returning. Callers that `await` this
 * function will resolve as soon as recipients are resolved and the
 * send has been *initiated* — not once the email actually lands.
 *
 * Errors during send are caught and logged inside `sendNotification`
 * and will not reject this promise or the fire-and-forget inner call.
 *
 * @param actorId — who triggered the action
 * @param action — action label (e.g. "Създадена", "Актуализирана")
 * @param category — category href string (e.g. "/golf-clubs")
 */
export async function notifyTaskChange({
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

  const categoryLabel = getCategoryLabel(category);

  // Fire-and-forget — intentionally not awaited, matching the
  // original sendBulkNotification's `void transporter.sendMail(...)`.
  // sendNotification catches and logs its own errors, so this can't
  // produce an unhandled promise rejection.
  void sendNotification({
    to: emailList,
    subject: "Известие за задача",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; background-color: #f9f9f9;">
          <h3 style="color: #CDA349;">${action} задача в категория: ${categoryLabel}</h3>
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
 *
 * Awaited end-to-end (matches original `sendCommentNotification`,
 * which used `await transporter.sendMail(...)`).
 *
 * `type` covers every `CommentInteractionType` variant, including
 * `"reaction"` — this is the single entry point for all three.
 * There is deliberately no separate `notifyReaction` function; see
 * note below.
 *
 * @param actorId — who triggered the comment/reply/reaction
 * @param actorName — display name of the actor
 * @param taskTitle — title of the task being commented on / reacted to
 * @param category — category href string
 * @param type — comment | reply | reaction
 */
export async function notifyComment({
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
  await notifyWithRecipients({
    actorId,
    errorContext: `comment (${type})`,
    sendFn: async (emailList) => {
      const categoryLabel = getCategoryLabel(category);
      const copy = INTERACTION_COPY[type];
      await sendNotification({
        to: emailList,
        subject: `${copy.subjectVerb}: ${taskTitle}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
            <h3 style="color: #CDA349; margin-top: 0;">AVEXIM Платформа</h3>
            <p style="font-size: 15px; color: #333;">
              Потребителят <strong>${actorName}</strong> ${copy.bodyVerb}:
              <strong>${taskTitle}</strong> в категория <span style="color: #CDA349; font-weight: bold;">${categoryLabel}</span>.
            </p>
 
            <p style="font-size: 12px; color: #888; border-top: 1px solid #eee;">
              Това е автоматично системно известие.
            </p>
          </div>
        `,
        errorContext: `comment (${type})`,
      });
    },
  });
}
