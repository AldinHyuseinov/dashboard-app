"use client";

import { useEffect, useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/actions/user-actions";
import SubmitButton from "@/components/SubmitButton";
import AlertBanner from "../notification/AlertBanner";
import { authClient } from "@/lib/auth-client";
import { codeErrorMessage } from "@/lib/code-errors";
import EmailCodeStep from "./EmailCodeStep";

export default function ProfileForm({
  name,
  email,
  isVerified,
}: {
  name: string;
  email: string;
  isVerified: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateProfileAction, {});

  const [isPending, setIsPending] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Navigate away automatically if the server action is successful
  useEffect(() => {
    if (state.success) {
      router.push("/"); // Redirects to home page on success
    }
  }, [state.success, router]);

  // Which code the form is waiting for: one sent to the new address saved in
  // the form, or one confirming the current address. Null when none.
  const [codeStep, setCodeStep] = useState<"change" | "verify" | null>(null);

  // Each save with a new address asks for a code to it, even for the same address again.
  useEffect(() => {
    const newEmail = state.pendingEmail;
    if (!newEmail) return;
    let cancelled = false;
    authClient.emailOtp
      .requestEmailChange({ newEmail })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setAlertMessage({ type: "error", text: codeErrorMessage(error) });
        } else {
          setAlertMessage(null);
          setCodeStep("change");
        }
      })
      .catch(() => {
        if (!cancelled) setAlertMessage({ type: "error", text: "Възникна неочаквана грешка." });
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const handleVerifyEmail = async () => {
    setIsPending(true);
    setAlertMessage(null); // Clear any previous alerts before sending

    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) {
        setAlertMessage({ type: "error", text: codeErrorMessage(error) });
      } else {
        setCodeStep("verify");
      }
    } catch (err) {
      console.log("Failed to send verification code", err);
      setAlertMessage({ type: "error", text: "Възникна неочаквана грешка." });
    } finally {
      setIsPending(false);
    }
  };

  const finishCodeStep = (text: string) => {
    setCodeStep(null);
    setAlertMessage({ type: "success", text });
    router.refresh();
  };

  if (codeStep === "change" && state.pendingEmail) {
    const newEmail = state.pendingEmail;
    return (
      <ProfileCard>
        <EmailCodeStep
          email={newEmail}
          intro="Имейлът ще бъде сменен, след като въведете кода."
          confirm={(otp) => authClient.emailOtp.changeEmail({ newEmail, otp })}
          resend={() => authClient.emailOtp.requestEmailChange({ newEmail })}
          onDone={() => finishCodeStep(`Имейлът е сменен на ${newEmail}.`)}
          onCancel={() => setCodeStep(null)}
        />
      </ProfileCard>
    );
  }

  if (codeStep === "verify") {
    return (
      <ProfileCard>
        <EmailCodeStep
          email={email}
          intro="Потвърдете имейла си с кода."
          confirm={(otp) => authClient.emailOtp.verifyEmail({ email, otp })}
          resend={() =>
            authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" })
          }
          onDone={() => finishCodeStep("Имейлът ви е потвърден.")}
          onCancel={() => setCodeStep(null)}
        />
      </ProfileCard>
    );
  }

  return (
    <ProfileCard>
      <form action={formAction} className="flex flex-col gap-2">
        <div className="border-b border-gray-100 mb-4">
          <h1 className="text-xl font-bold text-tertiary-brown">Редакция на профила</h1>
          <p className="text-sm text-gray-500 my-2">
            Направи промени на своя профил. Натисни запази, когато приключиш.
          </p>
        </div>

        {alertMessage && <AlertBanner type={alertMessage.type}>{alertMessage.text}</AlertBanner>}

        {!isVerified && !alertMessage && (
          <AlertBanner type="warning">
            <span>Имейлът ви не е потвърден! Потвърдете или сменете имейла.</span>

            <button
              onClick={handleVerifyEmail}
              disabled={isPending}
              className={`btn-gold px-2 ${
                isPending ? "cursor-not-allowed opacity-70" : ""
              }`}
            >
              {isPending ? "Изпращане..." : "Потвърди"}
            </button>
          </AlertBanner>
        )}

        {state.errors?.form && (
          <div className="p-4 bg-red-100 text-red-600 rounded-md text-xs font-medium mb-2">
            {state.errors.form}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-bold text-gray-700">
              Име
            </label>
            <input
              id="name"
              name="name"
              defaultValue={name}
              className={`w-full border rounded-md p-2 transition-colors ${state.errors?.name ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
            />
            {state.errors?.name && <p className="text-xs text-red-500">{state.errors.name[0]}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-bold text-gray-700">
              Имейл
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={email}
              className={`w-full border rounded-md p-2 transition-colors ${state.errors?.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
            />
            {state.errors?.email && (
              <p className="text-xs text-red-500">{state.errors.email[0]}</p>
            )}
          </div>

          {/* --- Password Section Divider --- */}
          <div className="p-2 border-t border-gray-100 mt-4 text-center">
            <span className="text-xs font-bold text-primary-gold uppercase tracking-wider">
              Смяна на парола
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="oldPassword" className="text-sm font-bold text-gray-700">
              Стара парола
            </label>
            <input
              id="oldPassword"
              name="oldPassword"
              type="password"
              placeholder="••••••••"
              className={`w-full border rounded-md p-2 transition-colors ${state.errors?.oldPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
            />
            {state.errors?.oldPassword && (
              <p className="text-xs text-red-500">{state.errors.oldPassword[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="newPassword" className="text-sm font-bold text-gray-700">
              Нова парола
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="••••••••"
              className={`w-full border rounded-md p-2 transition-colors ${state.errors?.newPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
            />
            {state.errors?.newPassword && (
              <p className="text-xs text-red-500">{state.errors.newPassword[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-bold text-gray-700">
              Потвърди нова парола
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              className={`w-full border rounded-md p-2 transition-colors ${state.errors?.confirmPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold"}`}
            />
            {state.errors?.confirmPassword && (
              <p className="text-xs text-red-500">{state.errors.confirmPassword[0]}</p>
            )}
          </div>
        </div>

        <div className="mt-4 p-2 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
          >
            Отказ
          </button>
          <SubmitButton pendingText={"Запазване..."} defaultText={"Запази"} />
        </div>
      </form>
    </ProfileCard>
  );
}

/** The Profile's white card. */
function ProfileCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center items-start my-4 px-8 w-full">
      <div className="w-full sm:max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
        {children}
      </div>
    </div>
  );
}
