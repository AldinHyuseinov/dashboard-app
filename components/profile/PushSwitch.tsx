"use client";

import { useEffect, useState } from "react";
import { browserSupportsPush, currentSubscription, turnOffPush, turnOnPush } from "@/lib/push-browser";

type PushState = "checking" | "unsupported" | "blocked" | "off" | "on";

/** What each state means for the person, under the switch. */
const HINTS: Record<PushState, string> = {
  checking: "Проверка…",
  unsupported: "Този браузър не може да получава известия. Те идват по имейл.",
  blocked:
    "Известията са блокирани за този сайт. Разрешете ги в настройките на браузъра и опитайте отново.",
  off: "Известията идват по имейл.",
  on: "Известията идват на това устройство, вместо по имейл.",
};

const FAILED = "Известията не се включиха. Опитайте отново.";

/**
 * The "notifications on this device" switch. On, Notifications come here by
 * push instead of by email. The browser asks for permission only when the
 * person turns it on. `sessionEndpoints` are the devices the server has on
 * for this browser's session; `vapidPublicKey` is null when push isn't set up.
 */
export default function PushSwitch({
  vapidPublicKey,
  sessionEndpoints,
}: {
  vapidPublicKey: string | null;
  sessionEndpoints: string[];
}) {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = async (): Promise<PushState> => {
      if (!vapidPublicKey || !browserSupportsPush()) return "unsupported";
      if (Notification.permission === "denied") return "blocked";
      if (Notification.permission !== "granted") return "off";
      const subscription = await currentSubscription();
      return subscription && sessionEndpoints.includes(subscription.endpoint) ? "on" : "off";
    };
    check().then(
      (checked) => !cancelled && setState(checked),
      () => !cancelled && setState("off"),
    );
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey, sessionEndpoints]);

  const toggle = async () => {
    if (!vapidPublicKey) return;
    setBusy(true);
    setError(null);
    try {
      if (state === "on") {
        await turnOffPush();
        setState("off");
      } else {
        const result = await turnOnPush(vapidPublicKey);
        if (result === "on" || result === "blocked") setState(result);
        else if (result === "dismissed") setState("off");
        else setError(result.error);
      }
    } catch {
      setError(FAILED);
    } finally {
      setBusy(false);
    }
  };

  const on = state === "on";
  const usable = state === "on" || state === "off";

  return (
    <section className="w-full px-8 pb-4 sm:max-w-md sm:px-0">
      <div className="flex items-center justify-between gap-2 rounded-card border border-line bg-surface p-2">
        <div className="flex flex-col">
          <p id="push-switch-label" className="text-body font-semibold text-ink">
            Известия на това устройство
          </p>
          <p id="push-switch-hint" className="text-meta text-ink-2">
            {HINTS[state]}
          </p>
          {error && (
            <p role="alert" className="text-meta font-semibold text-error">
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="push-switch-label"
          aria-describedby="push-switch-hint"
          disabled={!usable || busy}
          onClick={toggle}
          className="flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${
              on ? "bg-gold" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-2.5 rounded-full bg-surface shadow transition-transform ${
                on ? "translate-x-2.5" : ""
              }`}
            />
          </span>
        </button>
      </div>
    </section>
  );
}
