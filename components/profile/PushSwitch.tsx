"use client";

import { useState } from "react";
import type { PushState } from "@/lib/app-prompts";
import { turnOffPush, turnOnPush, usePushState } from "@/lib/push-browser";

/** What each state means for the person, and what they can do about it. */
const HINTS: Record<PushState, string> = {
  checking: "Проверка…",
  unsupported:
    "Този браузър не може да получава известия, затова те идват по имейл. На iPhone добавете приложението към началния екран (Сподели → „Добави към началния екран“) и го отворете оттам.",
  blocked:
    "Блокирани от браузъра. Известията идват по имейл. Разрешете известията за този сайт в настройките на браузъра и опитайте отново.",
  off: "Изключени. Известията идват по имейл. Включете ги, за да идват на това устройство.",
  on: "Включени. Известията идват на това устройство вместо по имейл.",
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
  const [state, setState] = usePushState(vapidPublicKey, sessionEndpoints);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
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
        className="-my-0.5 flex min-h-touch min-w-touch shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${
            on ? "bg-gold" : "bg-ink-2"
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
  );
}
