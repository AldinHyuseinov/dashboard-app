import { beforeEach, describe, expect, it } from "vitest";
import { createAuth, type Auth } from "@/lib/auth";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { createNotifications, type NotifiedAction } from "@/lib/notifications";
import type { CodePurpose } from "@/lib/code-email";
import { createUser } from "./support/fixtures";
import { sessionFrom } from "./support/auth";

/** Anything a mail app could turn into a link. */
const LINK = /https?:\/\/|www\.|<a[\s>]|href\s*=/i;

/**
 * No email the system sends contains a link, so Gmail doesn't flag it and
 * iPhones aren't bounced into Safari. Every kind of email is sent through its
 * real path and caught by the in-memory EmailAdapter.
 */
describe("Emails hold no links", () => {
  let emails: InMemoryEmailAdapter;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
  });

  function expectNoLinks() {
    expect(emails.sent).toHaveLength(1);
    const [email] = emails.sent;
    expect(email.subject).not.toMatch(LINK);
    expect(email.html).not.toMatch(LINK);
  }

  describe("code emails", () => {
    let auth: Auth;
    const IVAN = "ivan@avexim.test";

    /** Sends the code email for each purpose the way the app does. */
    const send: Record<CodePurpose, (device: Headers) => Promise<unknown>> = {
      "forget-password": () => auth.api.requestPasswordResetEmailOTP({ body: { email: IVAN } }),
      "change-email": (device) =>
        auth.api.requestEmailChangeEmailOTP({
          headers: device,
          body: { newEmail: "ivan.petrov@avexim.test" },
        }),
      "email-verification": (device) =>
        auth.api.sendVerificationEmail({ headers: device, body: { email: IVAN } }),
    };

    beforeEach(() => {
      auth = createAuth({ emailAdapter: emails });
    });

    it.each(Object.keys(send) as CodePurpose[])("the %s email", async (purpose) => {
      await auth.api.signUpEmail({ body: { name: "Ivan", email: IVAN, password: "Staro!123" } });
      const { headers } = await auth.api.signInEmail({
        body: { email: IVAN, password: "Staro!123" },
        returnHeaders: true,
      });

      await send[purpose](sessionFrom(headers));

      expectNoLinks();
    });
  });

  describe("Notification emails", () => {
    /** One action of every type a Notification is sent for. */
    function actions(ownerId: string): Record<NotifiedAction["type"], NotifiedAction> {
      const owned = { title: "Нова винена листа", category: "golf-clubs", userId: ownerId };
      return {
        "task-created": { type: "task-created", category: "golf-clubs" },
        "task-edited": { type: "task-edited", category: "golf-clubs" },
        "task-deleted": { type: "task-deleted", category: "golf-clubs" },
        "task-done": { type: "task-done", task: owned },
        "task-not-done": { type: "task-not-done", task: owned },
        "comment-posted": { type: "comment-posted", task: owned },
        "reply-posted": { type: "reply-posted", task: owned, answeredAuthorId: ownerId },
        "reaction-added": { type: "reaction-added", task: owned, commentAuthorId: ownerId },
      };
    }

    const types = Object.keys(actions("any-owner")) as NotifiedAction["type"][];

    it.each(types)(
      "the %s email",
      async (type) => {
        const ivan = await createUser("Ivan");
        const maria = await createUser("Maria");
        const notifications = createNotifications({ emailAdapter: emails });

        await notifications.notify(maria, actions(ivan.id)[type]);

        expectNoLinks();
      },
    );
  });
});
