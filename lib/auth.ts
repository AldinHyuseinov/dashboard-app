import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { transporter } from "./email";

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
      updateEmailWithoutVerification: true,
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void transporter.sendMail({
        to: user.email,
        subject: "Потвърдете вашия имейл",
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>Добре дошли, ${user.name}!</h2>
              <p>Моля, кликнете върху бутона по-долу, за да потвърдите профила си в комуникационната платформа на AVEXIM.</p>
              <a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #CDA349; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Потвърди имейл</a>
              <p>Ако бутона не работи, използвайте линка: ${url}.</p>
            </div>
          `,
      });
    },
  },

  session: {
    cookieCache: {
      maxAge: 60, // 1 minute
    },
  },
  plugins: [nextCookies()],
});
