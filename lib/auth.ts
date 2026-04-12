import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  advanced: {
    trustedProxyHeaders: true,
  },

  database: prismaAdapter(prisma, {
    provider: "sqlserver",
  }),

  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true, // change when email verification is implemented
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  session: {
    cookieCache: {
      maxAge: 60, // 1 minute
    },
  },
  plugins: [nextCookies()],
});
