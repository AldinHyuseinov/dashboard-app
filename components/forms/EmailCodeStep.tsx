"use client";

import { useActionState, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { codeErrorMessage, isCode, NOT_A_CODE, type AuthError } from "@/lib/code-errors";
import { CODE_MINUTES } from "@/lib/code-email";
import { FormNotice } from "./FormMessage";
import TextField from "./TextField";

/** better-auth client's answer: `error` set when the request was refused. */
type AuthResult = { error?: AuthError | null };

/**
 * Asks for the 6-digit code just emailed to `email`. `confirm` checks it
 * with better-auth; `resend` asks for a fresh one. A wrong or expired code
 * says so under the field.
 */
export default function EmailCodeStep({
  email,
  intro,
  confirm,
  resend,
  onDone,
  onCancel,
}: {
  email: string;
  intro: string;
  confirm: (code: string) => Promise<AuthResult>;
  resend: () => Promise<AuthResult>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [state, formAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => {
      const code = String(formData.get("code") ?? "").trim();
      if (!isCode(code)) return { error: NOT_A_CODE };
      const { error } = await confirm(code);
      if (error) return { error: codeErrorMessage(error) };
      onDone();
      return {};
    },
    {},
  );

  const handleResend = async () => {
    const { error } = await resend();
    setNotice(error ? codeErrorMessage(error) : `Изпратихме нов код на ${email}.`);
  };

  return (
    <div className="flex flex-col gap-3">
      <FormNotice>
        {intro} Изпратихме 6-цифрен код на <strong className="break-all">{email}</strong>. Кодът е
        валиден {CODE_MINUTES} минути.
      </FormNotice>

      <form action={formAction} className="flex flex-col gap-3">
        <TextField
          id="code"
          label="Код от имейла"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          error={state.error}
        />
        <div className="flex flex-col-reverse gap-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Отказ
          </button>
          <SubmitButton pendingText="Проверка…" defaultText="Потвърди" />
        </div>
      </form>

      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={handleResend}
          className="min-h-touch self-start text-secondary font-semibold text-gold-ink underline-offset-2 hover:underline"
        >
          Изпрати нов код
        </button>
        {notice && (
          <p role="status" className="text-meta text-ink-2">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
