"use client";

import { useActionState, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import AlertBanner from "../notification/AlertBanner";
import { codeErrorMessage, isCode, NOT_A_CODE, type AuthError } from "@/lib/code-errors";
import { CODE_MINUTES } from "@/lib/code-email";

/** better-auth client's answer: `error` set when the request was refused. */
type AuthResult = { error?: AuthError | null };

/**
 * Asks for the 6-digit code just emailed to `email`, in the Profile's style.
 * `confirm` checks it with better-auth; `resend` asks for a fresh code.
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
    <form action={formAction} className="flex flex-col gap-2">
      <AlertBanner type="warning">
        <span>
          {intro} Изпратихме 6-цифрен код на <strong>{email}</strong>. Кодът е валиден{" "}
          {CODE_MINUTES} минути.
        </span>
      </AlertBanner>

      {notice && <p className="text-xs text-gray-600">{notice}</p>}

      <label htmlFor="code" className="text-sm font-bold text-gray-700">
        Код от имейла
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "code-error" : undefined}
        className={`w-full border rounded-md p-2 tracking-[0.5em] transition-colors ${state.error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
      />
      {state.error && (
        <p id="code-error" role="alert" className="text-xs text-red-500">
          {state.error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleResend}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
        >
          Изпрати нов код
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
        >
          Отказ
        </button>
        <SubmitButton pendingText="Проверка..." defaultText="Потвърди" />
      </div>
    </form>
  );
}
