"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateDetailsAction } from "@/actions/user-actions";
import SubmitButton from "@/components/SubmitButton";
import EmailCodeStep from "@/components/forms/EmailCodeStep";
import { FormError, FormNotice } from "@/components/forms/FormMessage";
import TextField from "@/components/forms/TextField";
import { authClient } from "@/lib/auth-client";
import { codeErrorMessage } from "@/lib/code-errors";

const UNEXPECTED = "Възникна неочаквана грешка. Опитайте отново.";

/** Which code the form waits for: one sent to a new address, or one confirming the current one. */
type CodeStep = { kind: "change"; email: string } | { kind: "verify" };

type Message = { tone: "success" | "error"; text: string };

/**
 * The Profile's name and email. A new name is saved at once. A new email
 * waits for the code sent to it, as does confirming the current one; the
 * code step takes the form's place until it's done or cancelled.
 */
export default function DetailsForm({
  name,
  email,
  isVerified,
}: {
  name: string;
  email: string;
  isVerified: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateDetailsAction, {});
  const [codeStep, setCodeStep] = useState<CodeStep | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);

  // Each save with a new address asks for a code to it, even for the same address again.
  useEffect(() => {
    const newEmail = state.pendingEmail;
    if (!newEmail) return;
    let cancelled = false;
    authClient.emailOtp.requestEmailChange({ newEmail }).then(
      ({ error }) => {
        if (cancelled) return;
        if (error) setMessage({ tone: "error", text: codeErrorMessage(error) });
        else setCodeStep({ kind: "change", email: newEmail });
      },
      () => !cancelled && setMessage({ tone: "error", text: UNEXPECTED }),
    );
    return () => {
      cancelled = true;
    };
  }, [state]);

  const verifyEmail = async () => {
    setSending(true);
    setMessage(null);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) setMessage({ tone: "error", text: codeErrorMessage(error) });
      else setCodeStep({ kind: "verify" });
    } catch {
      setMessage({ tone: "error", text: UNEXPECTED });
    } finally {
      setSending(false);
    }
  };

  const finishCodeStep = (text: string) => {
    setCodeStep(null);
    setMessage({ tone: "success", text });
    router.refresh();
  };

  if (codeStep?.kind === "change") {
    const newEmail = codeStep.email;
    return (
      <EmailCodeStep
        email={newEmail}
        intro="Имейлът ще бъде сменен, след като въведете кода."
        confirm={(otp) => authClient.emailOtp.changeEmail({ newEmail, otp })}
        resend={() => authClient.emailOtp.requestEmailChange({ newEmail })}
        onDone={() => finishCodeStep(`Имейлът е сменен на ${newEmail}.`)}
        onCancel={() => setCodeStep(null)}
      />
    );
  }

  if (codeStep?.kind === "verify") {
    return (
      <EmailCodeStep
        email={email}
        intro="Потвърдете имейла си с кода."
        confirm={(otp) => authClient.emailOtp.verifyEmail({ email, otp })}
        resend={() => authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })}
        onDone={() => finishCodeStep("Имейлът ви е потвърден.")}
        onCancel={() => setCodeStep(null)}
      />
    );
  }

  return (
    <form
      action={(formData) => {
        setMessage(null);
        formAction(formData);
      }}
      className="flex flex-col gap-3"
    >
      {message?.tone === "error" && <FormError>{message.text}</FormError>}
      {message?.tone === "success" && <FormNotice tone="success">{message.text}</FormNotice>}
      {!message && state.saved?.name && <FormNotice tone="success">Името е запазено.</FormNotice>}
      {!message && state.saved?.anything === false && (
        <FormNotice>Няма промени за запазване.</FormNotice>
      )}
      {state.errors?.form && <FormError>{state.errors.form}</FormError>}

      <TextField
        id="name"
        label="Име"
        autoComplete="name"
        required
        defaultValue={state.values?.name ?? name}
        error={state.errors?.name}
      />

      <div className="flex flex-col gap-1">
        <TextField
          id="email"
          label="Имейл"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.values?.email ?? email}
          error={state.errors?.email}
        />
        <p className="text-meta text-ink-2">Нов имейл влиза в сила с код, изпратен на него.</p>
      </div>

      {!isVerified && (
        <div className="flex flex-col gap-1 rounded-tile bg-tint p-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-secondary text-ink">Имейлът ви не е потвърден.</p>
          <button
            type="button"
            onClick={verifyEmail}
            disabled={sending}
            className="btn-ghost shrink-0 bg-surface disabled:opacity-60"
          >
            {sending ? "Изпращане…" : "Потвърди с код"}
          </button>
        </div>
      )}

      <SubmitButton pendingText="Запазване…" defaultText="Запази" />
    </form>
  );
}
