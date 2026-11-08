"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AUTH_ERROR, codeErrorMessage, isCode, NOT_A_CODE } from "@/lib/code-errors";
import { CODE_MINUTES } from "@/lib/code-email";
import { PASSWORD_RULES_SUMMARY, passwordProblems } from "@/lib/password-rules";
import SubmitButton from "../SubmitButton";
import { FormError, FormNotice } from "./FormMessage";
import TextField from "./TextField";

type CodeState = {
  errors?: { code?: string; newPassword?: string; confirmPassword?: string; form?: string };
};

/**
 * "Forgot password": the email address first, then the 6-digit code emailed
 * to it with a new password. Both steps go to better-auth over HTTP, so its
 * per-IP rate limits apply. Success leads back to sign-in, since a reset
 * signs the person out everywhere.
 */
export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [emailState, emailAction] = useActionState(
    async (_: { error?: string }, formData: FormData) => {
      const address = String(formData.get("email") ?? "").trim();
      const { error } = await authClient.emailOtp.requestPasswordReset({ email: address });
      if (error) return { error: codeErrorMessage(error) };
      setEmail(address);
      return {};
    },
    {},
  );

  const [codeState, codeAction] = useActionState(
    async (_: CodeState, formData: FormData): Promise<CodeState> => {
      const code = String(formData.get("code") ?? "").trim();
      const newPassword = String(formData.get("newPassword") ?? "");
      const confirmPassword = String(formData.get("confirmPassword") ?? "");

      const errors: CodeState["errors"] = {};
      if (!isCode(code)) errors.code = NOT_A_CODE;
      const [problem] = passwordProblems(newPassword);
      if (problem) errors.newPassword = problem;
      else if (newPassword !== confirmPassword) errors.confirmPassword = "Паролите не съвпадат";
      if (Object.keys(errors).length > 0) return { errors };

      const { error } = await authClient.emailOtp.resetPassword({
        email: email!,
        otp: code,
        password: newPassword,
      });
      if (error) {
        const message = codeErrorMessage(error);
        return error.code === AUTH_ERROR.WEAK_PASSWORD
          ? { errors: { newPassword: message } }
          : { errors: { form: message } };
      }

      router.push("/login?password-reset=true");
      return {};
    },
    {},
  );

  const resend = async () => {
    const { error } = await authClient.emailOtp.requestPasswordReset({ email: email! });
    setNotice(error ? codeErrorMessage(error) : "Изпратихме нов код.");
  };

  if (!email) {
    return (
      <div className="flex flex-col gap-3">
        {emailState.error && <FormError>{emailState.error}</FormError>}
        <form action={emailAction} className="flex flex-col gap-3">
          <TextField
            id="email"
            label="Имейл"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
          />
          <SubmitButton className="pt-1" pendingText="Изпращане…" defaultText="Изпрати код" />
        </form>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormNotice>
        Ако <strong>{email}</strong> е имейл на служебен профил, изпратихме на него 6-цифрен код.
        Кодът е валиден {CODE_MINUTES} минути.
      </FormNotice>

      {codeState.errors?.form && <FormError>{codeState.errors.form}</FormError>}

      <form action={codeAction} className="flex flex-col gap-3">
        <TextField
          id="code"
          label="Код от имейла"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          error={codeState.errors?.code}
        />
        <TextField
          id="newPassword"
          label="Нова парола"
          type="password"
          autoComplete="new-password"
          required
          error={codeState.errors?.newPassword}
        />
        <TextField
          id="confirmPassword"
          label="Потвърди новата парола"
          type="password"
          autoComplete="new-password"
          required
          error={codeState.errors?.confirmPassword}
        />
        <p className="text-meta text-ink-2">
          {PASSWORD_RULES_SUMMARY}
        </p>
        <SubmitButton className="pt-1" pendingText="Запазване…" defaultText="Запази новата парола" />
      </form>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={resend}
          className="min-h-6 self-start text-secondary font-semibold text-gold-ink underline-offset-2 hover:underline"
        >
          Изпрати нов код
        </button>
        {notice && (
          <p role="status" className="text-meta text-ink-2">
            {notice}
          </p>
        )}
      </div>
      <BackToSignIn />
    </div>
  );
}

function BackToSignIn() {
  return (
    <Link
      href="/login"
      className="flex min-h-6 items-center self-start text-secondary font-semibold text-gold-ink underline-offset-2 hover:underline"
    >
      Назад към вход
    </Link>
  );
}
