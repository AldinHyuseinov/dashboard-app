import nodemailer from "nodemailer";

// Adapter types and implementation
export type { EmailAdapter } from "./email-adapter";
import { NodemailerAdapter as _NodemailerAdapter } from "./email-adapter";
export { _NodemailerAdapter as NodemailerAdapter };

/**
 * @deprecated Use `emailAdapter` from this module instead.
 * Direct transporter access is preserved for backwards compatibility
 * with existing callers in `lib/auth.ts`.
 */
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Default adapter instance — callers can use `emailAdapter.send(...)`
export const emailAdapter = new _NodemailerAdapter({ transporter });
