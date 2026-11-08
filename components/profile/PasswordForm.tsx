"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/actions/user-actions";
import SubmitButton from "@/components/SubmitButton";
import { FormError, FormNotice } from "@/components/forms/FormMessage";
import TextField from "@/components/forms/TextField";
import { PASSWORD_RULES_SUMMARY } from "@/lib/password-rules";

/** Changes the password. Every other device is signed out; this one stays signed in. */
export default function PasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(changePasswordAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.changed && (
        <FormNotice tone="success">
          Паролата е сменена. Другите устройства излязоха от профила.
        </FormNotice>
      )}
      {state.errors?.form && <FormError>{state.errors.form}</FormError>}

      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <TextField
        id="oldPassword"
        label="Стара парола"
        type="password"
        autoComplete="current-password"
        required
        error={state.errors?.oldPassword}
      />
      <div className="flex flex-col gap-1">
        <TextField
          id="newPassword"
          label="Нова парола"
          type="password"
          autoComplete="new-password"
          required
          error={state.errors?.newPassword}
        />
        <p className="text-meta text-ink-2">{PASSWORD_RULES_SUMMARY}</p>
      </div>
      <TextField
        id="confirmPassword"
        label="Потвърди новата парола"
        type="password"
        autoComplete="new-password"
        required
        error={state.errors?.confirmPassword}
      />

      <SubmitButton pendingText="Смяна…" defaultText="Смени паролата" />
    </form>
  );
}
