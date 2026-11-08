import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth, type Auth } from "@/lib/auth";
import { InMemoryEmailAdapter } from "@/lib/email-adapter";
import { canSignIn as canSignInWith, sessionFrom } from "./support/auth";

const PASSWORD = "Staro!123";
const NEW_PASSWORD = "Novo!4567";
const MONDAY_9AM = new Date("2026-11-02T09:00:00Z");
const MINUTE = 60_000;

/** A 6-digit code that isn't `code`. */
function wrong(code: string) {
  return code === "000000" ? "111111" : "000000";
}

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Account recovery and email changes with 6-digit codes, through better-auth's
 * server API, with every code read from the email the in-memory adapter caught.
 */
describe("Accounts", () => {
  let emails: InMemoryEmailAdapter;
  let auth: Auth;

  beforeEach(() => {
    emails = new InMemoryEmailAdapter();
    auth = createAuth({ emailAdapter: emails });
  });

  /** Adds a staff member with PASSWORD, as the seed route does. */
  async function addStaff(name: string, email = `${name.toLowerCase()}@avexim.test`) {
    await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
    return email;
  }

  /** The 6-digit code in the last email sent to `to`. */
  function codeSentTo(to: string) {
    const email = emails.sent.findLast((sent) => sent.to.includes(to));
    if (!email) throw new Error(`No email was sent to ${to}`);
    const code = email.html.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error(`The email to ${to} holds no 6-digit code`);
    return code;
  }

  /** Signs in on a new device: the headers its later requests carry. */
  async function signIn(email: string, password: string) {
    const { headers } = await auth.api.signInEmail({
      body: { email, password },
      returnHeaders: true,
    });
    return sessionFrom(headers);
  }

  function canSignIn(email: string, password: string) {
    return canSignInWith(auth, email, password);
  }

  describe("Forgot password", () => {
    it("sends a 6-digit code that sets a new password", async () => {
      const ivan = await addStaff("Ivan");

      await auth.api.requestPasswordResetEmailOTP({ body: { email: ivan } });
      await auth.api.resetPasswordEmailOTP({
        body: { email: ivan, otp: codeSentTo(ivan), password: NEW_PASSWORD },
      });

      expect(await canSignIn(ivan, NEW_PASSWORD)).toBe(true);
      expect(await canSignIn(ivan, PASSWORD)).toBe(false);
    });

    it("refuses a code entered more than 10 minutes after it was sent", async () => {
      const ivan = await addStaff("Ivan");
      vi.useFakeTimers({ toFake: ["Date"], now: MONDAY_9AM });
      await auth.api.requestPasswordResetEmailOTP({ body: { email: ivan } });

      vi.setSystemTime(new Date(MONDAY_9AM.getTime() + 9 * MINUTE));
      await expect(
        auth.api.resetPasswordEmailOTP({
          body: { email: ivan, otp: wrong(codeSentTo(ivan)), password: NEW_PASSWORD },
        }),
      ).rejects.toThrow("Invalid OTP");

      vi.setSystemTime(new Date(MONDAY_9AM.getTime() + 11 * MINUTE));
      await expect(
        auth.api.resetPasswordEmailOTP({
          body: { email: ivan, otp: codeSentTo(ivan), password: NEW_PASSWORD },
        }),
      ).rejects.toThrow("OTP expired");
      expect(await canSignIn(ivan, PASSWORD)).toBe(true);
    });

    it("refuses even the right code after 3 wrong ones", async () => {
      const ivan = await addStaff("Ivan");
      await auth.api.requestPasswordResetEmailOTP({ body: { email: ivan } });
      const code = codeSentTo(ivan);

      for (let attempt = 0; attempt < 3; attempt++) {
        await expect(
          auth.api.resetPasswordEmailOTP({
            body: { email: ivan, otp: wrong(code), password: NEW_PASSWORD },
          }),
        ).rejects.toThrow("Invalid OTP");
      }

      await expect(
        auth.api.resetPasswordEmailOTP({ body: { email: ivan, otp: code, password: NEW_PASSWORD } }),
      ).rejects.toThrow();
      expect(await canSignIn(ivan, PASSWORD)).toBe(true);
    });

    it("refuses a new password that breaks the password rules, and the code still works", async () => {
      const ivan = await addStaff("Ivan");
      await auth.api.requestPasswordResetEmailOTP({ body: { email: ivan } });
      const code = codeSentTo(ivan);

      await expect(
        auth.api.resetPasswordEmailOTP({ body: { email: ivan, otp: code, password: "novaparola1" } }),
      ).rejects.toThrow("Трябва да съдържа поне една главна буква");

      await auth.api.resetPasswordEmailOTP({
        body: { email: ivan, otp: code, password: NEW_PASSWORD },
      });
      expect(await canSignIn(ivan, NEW_PASSWORD)).toBe(true);
    });

    it("signs Ivan out on every device", async () => {
      const ivan = await addStaff("Ivan");
      const phone = await signIn(ivan, PASSWORD);

      await auth.api.requestPasswordResetEmailOTP({ body: { email: ivan } });
      await auth.api.resetPasswordEmailOTP({
        body: { email: ivan, otp: codeSentTo(ivan), password: NEW_PASSWORD },
      });

      expect(await auth.api.getSession({ headers: phone })).toBeNull();
    });

    it("sends nothing for an address no staff member has", async () => {
      await addStaff("Ivan");
      emails.sent.length = 0;

      await auth.api.requestPasswordResetEmailOTP({ body: { email: "nobody@avexim.test" } });

      expect(emails.sent).toEqual([]);
    });
  });

  describe("Adding staff", () => {
    it("doesn't sign the new staff member in", async () => {
      const added = await auth.api.signUpEmail({
        body: { name: "Ivan", email: "ivan@avexim.test", password: PASSWORD },
      });

      expect(added.token).toBeNull();
    });
  });

  describe("Signing in", () => {
    it("takes the password: there is no signing in with an emailed code", async () => {
      const ivan = await addStaff("Ivan");

      await expect(
        auth.api.sendVerificationOTP({ body: { email: ivan, type: "sign-in" } }),
      ).rejects.toThrow();
      expect(emails.sent).toEqual([]);

      const response = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-in/email-otp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: ivan, otp: "123456" }),
        }),
      );
      expect(response.status).toBe(404);
    });
  });

  describe("Sessions", () => {
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    async function expiryOf(device: Headers) {
      const session = await auth.api.getSession({ headers: device });
      return session?.session.expiresAt.getTime();
    }

    it("last 90 days from signing in", async () => {
      const ivan = await addStaff("Ivan");
      vi.useFakeTimers({ toFake: ["Date"], now: MONDAY_9AM });

      const phone = await signIn(ivan, PASSWORD);

      expect(await expiryOf(phone)).toBe(MONDAY_9AM.getTime() + 90 * DAY);
    });

    it("are renewed for another 90 days on use, at most once a day", async () => {
      const ivan = await addStaff("Ivan");
      vi.useFakeTimers({ toFake: ["Date"], now: MONDAY_9AM });
      const phone = await signIn(ivan, PASSWORD);

      vi.setSystemTime(MONDAY_9AM.getTime() + 23 * HOUR);
      expect(await expiryOf(phone)).toBe(MONDAY_9AM.getTime() + 90 * DAY);

      vi.setSystemTime(MONDAY_9AM.getTime() + 25 * HOUR);
      expect(await expiryOf(phone)).toBe(MONDAY_9AM.getTime() + 25 * HOUR + 90 * DAY);
    });

    it("end after 90 days without use", async () => {
      const ivan = await addStaff("Ivan");
      vi.useFakeTimers({ toFake: ["Date"], now: MONDAY_9AM });
      const phone = await signIn(ivan, PASSWORD);

      vi.setSystemTime(MONDAY_9AM.getTime() + 90 * DAY + MINUTE);

      expect(await auth.api.getSession({ headers: phone })).toBeNull();
    });
  });

  describe("Confirming the email address", () => {
    it("the verification email carries a code that confirms the address", async () => {
      const ivan = await addStaff("Ivan");
      const laptop = await signIn(ivan, PASSWORD);

      await auth.api.sendVerificationEmail({ headers: laptop, body: { email: ivan } });
      await auth.api.verifyEmailOTP({
        headers: laptop,
        body: { email: ivan, otp: codeSentTo(ivan) },
      });

      const session = await auth.api.getSession({ headers: laptop });
      expect(session?.user.emailVerified).toBe(true);
    });
  });

  describe("Changing the email in the Profile", () => {
    async function emailOf(device: Headers) {
      return (await auth.api.getSession({ headers: device }))?.user.email;
    }

    it("applies the new address only once the code sent to it is entered", async () => {
      const ivan = await addStaff("Ivan");
      const laptop = await signIn(ivan, PASSWORD);

      await auth.api.requestEmailChangeEmailOTP({
        headers: laptop,
        body: { newEmail: "ivan.petrov@avexim.test" },
      });
      expect(await emailOf(laptop)).toBe(ivan);

      await auth.api.changeEmailEmailOTP({
        headers: laptop,
        body: { newEmail: "ivan.petrov@avexim.test", otp: codeSentTo("ivan.petrov@avexim.test") },
      });
      expect(await emailOf(laptop)).toBe("ivan.petrov@avexim.test");
      expect(await canSignIn("ivan.petrov@avexim.test", PASSWORD)).toBe(true);
    });

    it("keeps the old address when the code is wrong", async () => {
      const ivan = await addStaff("Ivan");
      const laptop = await signIn(ivan, PASSWORD);
      await auth.api.requestEmailChangeEmailOTP({
        headers: laptop,
        body: { newEmail: "ivan.petrov@avexim.test" },
      });

      await expect(
        auth.api.changeEmailEmailOTP({
          headers: laptop,
          body: {
            newEmail: "ivan.petrov@avexim.test",
            otp: wrong(codeSentTo("ivan.petrov@avexim.test")),
          },
        }),
      ).rejects.toThrow("Invalid OTP");
      expect(await emailOf(laptop)).toBe(ivan);
    });

    it("refuses an address another staff member has, without sending a code", async () => {
      const ivan = await addStaff("Ivan");
      const maria = await addStaff("Maria");
      const laptop = await signIn(ivan, PASSWORD);
      emails.sent.length = 0;

      await expect(
        auth.api.requestEmailChangeEmailOTP({ headers: laptop, body: { newEmail: maria } }),
      ).rejects.toThrow("Този имейл вече се използва.");
      expect(emails.sent).toEqual([]);
    });

    it("can't change the address without a code", async () => {
      const ivan = await addStaff("Ivan");
      const laptop = await signIn(ivan, PASSWORD);

      await expect(
        auth.api.changeEmail({ headers: laptop, body: { newEmail: "ivan.petrov@avexim.test" } }),
      ).rejects.toThrow();
      expect(await emailOf(laptop)).toBe(ivan);
    });
  });

  describe("Changing the password in the Profile", () => {
    it("signs Ivan out on his other devices but keeps this one", async () => {
      const ivan = await addStaff("Ivan");
      const laptop = await signIn(ivan, PASSWORD);
      const phone = await signIn(ivan, PASSWORD);

      await auth.api.changePassword({
        headers: laptop,
        body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
      });

      expect(await auth.api.getSession({ headers: phone })).toBeNull();
      // The same session goes on, so notifications turned on here stay on.
      expect(await auth.api.getSession({ headers: laptop })).not.toBeNull();
    });

    it("refuses a new password that breaks the password rules", async () => {
      const ivan = await addStaff("Ivan");
      const laptop = await signIn(ivan, PASSWORD);

      await expect(
        auth.api.changePassword({
          headers: laptop,
          body: { currentPassword: PASSWORD, newPassword: "Novaparola1" },
        }),
      ).rejects.toThrow("Трябва да съдържа специален символ (!@#$%^&*)");
      expect(await canSignIn(ivan, PASSWORD)).toBe(true);
    });
  });
});
