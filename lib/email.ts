// Adapter types and implementation
export type { EmailAdapter } from "./email-adapter";
import { NodemailerAdapter as _NodemailerAdapter } from "./email-adapter";
export { _NodemailerAdapter as NodemailerAdapter };

/** The production adapter: Gmail SMTP through Nodemailer, from SMTP_USER and SMTP_PASS. */
export const emailAdapter = new _NodemailerAdapter();
