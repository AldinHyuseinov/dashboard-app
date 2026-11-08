"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { feedPrompts, type PutOffCard } from "@/lib/app-prompts";
import {
  canPromptInstall,
  isCardPutOff,
  promptInstall,
  putCardOff,
  subscribeInstallPrompt,
  thisDevice,
} from "@/lib/install-browser";
import { turnOnPush, usePushState } from "@/lib/push-browser";
import { AddToHomeIcon, BellIcon, CheckIcon, InstallIcon, ShareIcon } from "@/components/shell/icons";

/** After the person tapped "turn on": what happened, said in the card. */
type TurnOnOutcome = "on" | "blocked" | { error: string };

const TURN_ON_FAILED = "Известията не се включиха. Опитайте отново.";

/**
 * The Feed's cards asking something of this device (see `feedPrompts`):
 * install the app (step by step on iPhone, the browser's prompt on
 * Android), and turn notifications on. Permission is asked for only when
 * the person taps the card's button. Shows nothing until it's known what the
 * device can do, and nothing at all once it's done or put off.
 */
export default function FeedPrompt({
  vapidPublicKey,
  sessionEndpoints,
}: {
  vapidPublicKey: string | null;
  sessionEndpoints: string[];
}) {
  const [push, setPush] = usePushState(vapidPublicKey, sessionEndpoints);
  // Put off on this screen; kept in the browser too, unless it has no storage.
  const [putOffHere, setPutOffHere] = useState<Record<PutOffCard, boolean>>({ install: false, notifications: false });
  const [outcome, setOutcome] = useState<TurnOnOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const installable = useSyncExternalStore(subscribeInstallPrompt, canPromptInstall, () => false);
  // The device is read only in the browser, after a first render that matches the server's.
  const inBrowser = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const putCardOffForLater = (card: PutOffCard) => {
    putCardOff(card);
    setPutOffHere((current) => ({ ...current, [card]: true }));
    if (card === "notifications") setOutcome(null);
  };

  const turnOn = async () => {
    if (!vapidPublicKey) return;
    setBusy(true);
    setOutcome(null);
    try {
      const result = await turnOnPush(vapidPublicKey);
      if (result === "on" || result === "blocked") setPush(result);
      if (result !== "dismissed") setOutcome(result);
    } catch {
      setOutcome({ error: TURN_ON_FAILED });
    } finally {
      setBusy(false);
    }
  };

  if (!inBrowser) return null;
  const device = thisDevice();
  const putOff = {
    install: putOffHere.install || isCardPutOff("install"),
    notifications: putOffHere.notifications || isCardPutOff("notifications"),
  };
  const prompts = feedPrompts({ device, push, canPromptInstall: installable, putOff });

  // Turning on just happened: keep saying how it went, though notifications are no longer off.
  const notificationsCard =
    outcome === "on" ? (
      <TurnedOn key="turned-on" />
    ) : outcome === "blocked" && !putOff.notifications ? (
      <Card
        key="blocked"
        icon={<BellIcon />}
        title="Известията са блокирани"
        text="Браузърът блокира известията за AVEXIM, затова те идват по имейл. Разрешете известията за сайта в настройките на браузъра и ги включете от Профила."
      >
        <LaterButton onClick={() => putCardOffForLater("notifications")} />
      </Card>
    ) : null;

  const cards = prompts.map((prompt) => {
    switch (prompt) {
      case "install-iphone":
        return (
          <Card
            key={prompt}
            icon={<InstallIcon />}
            title="Инсталирайте приложението"
            text="На iPhone известията идват само в инсталираното приложение. Добавете AVEXIM към началния екран:"
            more={<IphoneSteps inSafari={device.iosSafari} />}
          >
            <LaterButton onClick={() => putCardOffForLater("install")} />
          </Card>
        );
      case "install-android":
        return (
          <Card
            key={prompt}
            icon={<InstallIcon />}
            title="Инсталирайте приложението"
            text="AVEXIM се отваря в собствен прозорец, без лентите на браузъра, с икона на началния екран, която показва броя на новите неща."
          >
            <button type="button" className="btn-gold" onClick={() => void promptInstall()}>
              Инсталирай
            </button>
            <LaterButton onClick={() => putCardOffForLater("install")} />
          </Card>
        );
      case "turn-on":
        // Turned on or blocked a moment ago: that card says so instead.
        if (notificationsCard) return null;
        return (
          <Card
            key={prompt}
            icon={<BellIcon />}
            title="Включете известията"
            text="Ще ви уведомяваме на това устройство, когато някой отговори на ваш коментар или промени задача. Докато са изключени, известията идват по имейл."
            error={outcome && typeof outcome === "object" ? outcome.error : null}
          >
            <button type="button" className="btn-gold disabled:opacity-60" onClick={turnOn} disabled={busy}>
              {busy ? "Включване…" : "Включи известията"}
            </button>
            <LaterButton onClick={() => putCardOffForLater("notifications")} />
          </Card>
        );
    }
  });

  if (!notificationsCard && prompts.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {cards}
      {notificationsCard}
    </div>
  );
}

/** Nothing changes what `inBrowser` says once it's true. */
function subscribeToNothing() {
  return () => {};
}

/** A card: an icon, what's asked and why, perhaps more to read, and what can be done about it. */
function Card({
  icon,
  title,
  text,
  more,
  error,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  more?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-2">
      <div className="flex items-start gap-2">
        <span className="mt-0.25 shrink-0 text-gold-ink">{icon}</span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={titleId} className="text-body font-semibold">
            {title}
          </h2>
          <p className="text-secondary text-ink-2">{text}</p>
          {error && (
            <p role="alert" className="text-meta font-semibold text-error">
              {error}
            </p>
          )}
        </div>
      </div>
      {more}
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );
}

function LaterButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick}>
      По-късно
    </button>
  );
}

/**
 * Adding AVEXIM to the home screen on iPhone, step by step: Safari has no
 * install button. Names the iPhone's buttons in Bulgarian and English, as
 * phones are set to either.
 */
function IphoneSteps({ inSafari }: { inSafari: boolean }) {
  const steps = [
    !inSafari && <>Отворете тази страница в Safari.</>,
    <>
      Докоснете <ShareIcon size={18} className="inline-block align-[-3px] text-gold-ink" />{" "}
      <strong className="font-semibold">„Сподели“</strong> (Share) в лентата на Safari.
    </>,
    <>
      Изберете <AddToHomeIcon size={18} className="inline-block align-[-3px] text-gold-ink" />{" "}
      <strong className="font-semibold">„Добави към началния екран“</strong> (Add to Home Screen). Ако не го
      виждате, превъртете списъка надолу.
    </>,
    <>
      Докоснете <strong className="font-semibold">„Добави“</strong> (Add).
    </>,
    <>Отворете AVEXIM от началния екран и включете известията.</>,
  ].filter(Boolean);

  return (
    <ol className="flex flex-col gap-1 text-secondary">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span
            aria-hidden="true"
            className="flex size-3 shrink-0 items-center justify-center rounded-full bg-tint text-meta font-semibold text-gold-ink"
          >
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.25">{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** Notifications just turned on: says so, in the Done colour. */
function TurnedOn() {
  return (
    <p role="status" className="flex items-center gap-1 rounded-card bg-vine-tint p-2 text-secondary font-semibold text-vine">
      <CheckIcon size={20} />
      Известията са включени за това устройство.
    </p>
  );
}
