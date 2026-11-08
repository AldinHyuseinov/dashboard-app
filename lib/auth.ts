import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { prisma } from "./prisma";
import { emailAdapter as defaultEmailAdapter } from "./email";
import type { EmailAdapter } from "./email-adapter";
import { CODE_MINUTES, codeEmail } from "./code-email";
import { passwordProblems } from "./password-rules";
import { AUTH_ERROR } from "./code-errors";

const DAY_SECONDS = 24 * 60 * 60;

export type AuthDeps = {
  emailAdapter: EmailAdapter;
};

/**
 * better-auth, configured for staff accounts. Codes go out through the given
 * EmailAdapter; production uses the default instance exported below, tests
 * inject an InMemoryEmailAdapter.
 */
export function createAuth({ emailAdapter }: AuthDeps) {
  return betterAuth({
    advanced: {
      trustedProxyHeaders: true,
    },

    // The email OTP plugin also offers signing in with a code alone, which
    // staff don't use: they sign in with their password (sending sign-in codes
    // is refused below too). The other path is the plugin's deprecated twin
    // of request-password-reset.
    disabledPaths: ["/sign-in/email-otp", "/forget-password/email-otp"],

    database: prismaAdapter(prisma, {
      provider: "sqlserver",
    }),

    user: {
      // Off: it would apply a new address unverified or send a link. The
      // email OTP plugin's change-email, below, applies it only with a code.
      changeEmail: { enabled: false },
    },

    emailAndPassword: {
      enabled: true,
      // Adding staff (the seed route) creates the account without signing
      // into it, so no session cookie for it leaves the server.
      autoSignIn: false,
      // A password reset with a code signs the person out everywhere.
      revokeSessionsOnPasswordReset: true,
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/email-otp/send-verification-otp" && ctx.body?.type === "sign-in") {
          throw new APIError("BAD_REQUEST", {
            message: "Signing in with a code is turned off",
            code: AUTH_ERROR.SIGN_IN_CODES_OFF,
          });
        }
        if (ctx.path === "/email-otp/request-email-change") {
          await refuseTakenEmail(ctx);
        }
        if (ctx.path === "/email-otp/reset-password") {
          refuseWeakPassword(ctx.body?.password);
        }
        if (ctx.path === "/change-password") {
          refuseWeakPassword(ctx.body?.newPassword);
          // A password change always signs out the person's other devices.
          return { context: { body: { ...ctx.body, revokeOtherSessions: true } } };
        }
      }),
    },

    session: {
      expiresIn: 90 * DAY_SECONDS,
      // Using the app renews the session for another 90 days, at most once a day.
      updateAge: DAY_SECONDS,
      cookieCache: {
        maxAge: 60, // 1 minute
      },
    },

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: CODE_MINUTES * 60,
        changeEmail: { enabled: true },
        // The verification email carries a code instead of a link.
        overrideDefaultEmailVerification: true,
        // Staff accounts are only ever added through the seed route.
        disableSignUp: true,
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type === "sign-in") return; // refused by the hook above
          // Not awaited, so how long a reply takes can't tell whether the
          // address belongs to anyone.
          void emailAdapter
            .send({ to: email, ...codeEmail(type, otp) })
            .catch((error) => console.error(`Code email failed (${type}):`, error));
        },
      }),
      nextCookies(), // must stay last
    ],
  });
}

/** Refuses a new password that breaks the password rules, naming the first rule broken. */
function refuseWeakPassword(password: unknown) {
  if (typeof password !== "string") return; // better-auth's own body check refuses it
  const [problem] = passwordProblems(password);
  if (problem) throw new APIError("BAD_REQUEST", { message: problem, code: AUTH_ERROR.WEAK_PASSWORD });
}

/**
 * Refuses an email change to an address another staff member has. Left to
 * better-auth, the request would quietly send no code, and the person would
 * be stuck entering a code that never came. Staff know each other's
 * addresses, so saying it's taken gives nothing away.
 */
async function refuseTakenEmail(ctx: {
  body?: { newEmail?: unknown };
  context: { internalAdapter: { findUserByEmail(email: string): Promise<unknown> } };
}) {
  const newEmail = ctx.body?.newEmail;
  if (typeof newEmail !== "string") return; // better-auth's own body check refuses it
  if (await ctx.context.internalAdapter.findUserByEmail(newEmail.toLowerCase())) {
    throw new APIError("BAD_REQUEST", {
      message: "Този имейл вече се използва.",
      code: AUTH_ERROR.EMAIL_IN_USE,
    });
  }
}

export type Auth = ReturnType<typeof createAuth>;

export const auth = createAuth({ emailAdapter: defaultEmailAdapter });
