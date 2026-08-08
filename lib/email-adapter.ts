import nodemailer, { Transporter } from "nodemailer";

/**
 * Email sending abstraction — the seam for the notification module.
 *
 * Implementations:
 *   - NodemailerAdapter  — wraps nodemailer (production)
 *   - InMemoryAdapter    — captures messages for tests or serverless
 *   - SmtpAdapter        — future: direct SMTP without nodemailer
 */
export interface EmailAdapter {
  /**
   * Send an email.
   * @param params.to — single address or array
   * @param params.subject — email subject line
   * @param params.html — HTML body
   */
  send(params: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<void>;
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

  async send({
    to,
    subject,
    html,
  }: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: `"AVEXIM Система" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }
}
