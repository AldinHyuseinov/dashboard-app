import type { EmailMessage } from "./email-adapter";

/** Why a code was sent: better-auth's email OTP types, except sign-in, which is turned off. */
export type CodePurpose = "email-verification" | "forget-password" | "change-email";

/** What each code email asks the reader to do with the code. */
const COPY: Record<CodePurpose, { subject: string; lead: string }> = {
  "forget-password": {
    subject: "Код за нова парола",
    lead: "Въведете този код в екрана „Забравена парола“, за да зададете нова парола.",
  },
  "change-email": {
    subject: "Код за смяна на имейла",
    lead: "Въведете този код в профила си, за да смените имейла си с този адрес.",
  },
  "email-verification": {
    subject: "Код за потвърждение на имейла",
    lead: "Въведете този код в профила си, за да потвърдите имейла си.",
  },
};

/** Minutes a code stays valid; better-auth's OTP plugin is set to the same. */
export const CODE_MINUTES = 10;

/**
 * The email carrying a 6-digit code. It holds no link: the code is typed into
 * the app, so Gmail has nothing to flag and iPhones aren't sent to Safari.
 */
export function codeEmail(purpose: CodePurpose, code: string): Omit<EmailMessage, "to"> {
  const { subject, lead } = COPY[purpose];
  return {
    subject,
    html: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
        <h3 style="color: #CDA349; margin-top: 0;">AVEXIM Платформа</h3>
        <p style="font-size: 15px; color: #333;">${lead}</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</p>
        <p style="font-size: 13px; color: #666;">
          Кодът е валиден ${CODE_MINUTES} минути. Ако не сте го поискали, пренебрегнете този имейл.
        </p>
        <p style="font-size: 12px; color: #888; border-top: 1px solid #eee;">
          Това е автоматично системно известие.
        </p>
      </div>
    `,
  };
}
