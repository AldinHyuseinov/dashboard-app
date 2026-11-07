import nodemailer, { Transporter } from "nodemailer";

/** One outgoing email. `to` is a single address or a list. */
export type EmailMessage = {
  to: string | string[];
  subject: string;
  /** HTML body */
  html: string;
};

/**
 * Email sending abstraction — the seam for the notification module.
 *
 * Implementations:
 *   - NodemailerAdapter     — wraps nodemailer (production)
 *   - InMemoryEmailAdapter  — captures messages so tests can read them
 */
export interface EmailAdapter {
  send(message: EmailMessage): Promise<void>;
}

/** An email captured by {@link InMemoryEmailAdapter}; `to` is always a list. */
export type SentEmail = EmailMessage & { to: string[] };

/**
 * Keeps every email in memory instead of sending it. Inject it wherever an
 * EmailAdapter is accepted, then assert on `sent`.
 */
export class InMemoryEmailAdapter implements EmailAdapter {
  readonly sent: SentEmail[] = [];

  async send({ to, subject, html }: EmailMessage): Promise<void> {
    this.sent.push({ to: Array.isArray(to) ? [...to] : [to], subject, html });
  }
}

export interface NodemailerAdapterOptions {
  /**
   * Optional pre-built transporter. If not provided, a default
   * Gmail-based transporter is created from env vars.
   */
  transporter?: Transporter;
}

/**
 * Nodemailer-backed adapter.
 *
 * Wraps the existing nodemailer transporter so the rest of the
 * codebase can call `emailAdapter.send(...)` instead of
 * `transporter.sendMail(...)`.
 */
export class NodemailerAdapter implements EmailAdapter {
  private readonly transporter: Transporter;

  constructor(options?: NodemailerAdapterOptions) {
    this.transporter =
      options?.transporter ??
      nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
  }

  async send({ to, subject, html }: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: `"AVEXIM Система" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }
}
