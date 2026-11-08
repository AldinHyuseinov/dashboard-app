"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth-actions";
import SubmitButton from "../SubmitButton";
import { FormError, FormNotice } from "./FormMessage";
import TextField from "./TextField";

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, {});
  const searchParams = useSearchParams();
  const notAuthorized = searchParams.get("not-authorized") === "true";
  const passwordReset = searchParams.get("password-reset") === "true";

  return (
    <div className="flex flex-col gap-3">
      {notAuthorized && (
        <FormNotice>
          Трябва да се впишете, за да продължите.
        </FormNotice>
      )}

      {passwordReset && (
        <FormNotice>
          Паролата е сменена. Впишете се с новата парола.
        </FormNotice>
      )}

      {state?.errors?.form && <FormError>{state.errors.form}</FormError>}

      <form action={formAction} className="flex flex-col gap-3">
        <TextField
          id="email"
          label="Имейл"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={state?.errors?.email?.[0]}
        />
        <TextField
          id="password"
          label="Парола"
          type="password"
          autoComplete="current-password"
          error={state?.errors?.password?.[0]}
        />
        <SubmitButton className="pt-1" pendingText="Влизане…" defaultText="Вход" />
      </form>

      <Link
        href="/forgot-password"
        className="flex min-h-6 items-center self-start text-secondary font-semibold text-gold-ink underline-offset-2 hover:underline"
      >
        Забравена парола?
      </Link>
    </div>
  );
}
