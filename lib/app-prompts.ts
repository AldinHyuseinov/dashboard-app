/**
 * The Feed's cards that ask something of the device: install the app, or
 * turn notifications on. Which show depends on the phone and what it can
 * do, so it's decided in the browser, from facts this module reads there.
 */

/** What matters about the device the app is open on. */
export type Device = {
  /** An iPhone or iPad, whose browsers all use Safari underneath. */
  ios: boolean;
  /** Safari itself on iOS, the browser whose Share menu adds the app to the home screen. */
  iosSafari: boolean;
  /** Opened from the home screen, as an installed app. */
  installed: boolean;
};

/** Other browsers on iOS, and apps' own browsers, which add their names. */
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|Line\//;

/**
 * The device, from the browser's user agent and touch points, and whether
 * the app runs in a window of its own (`display-mode: standalone`, or
 * `navigator.standalone` on iOS).
 */
export function readDevice({
  userAgent,
  maxTouchPoints,
  standalone,
}: {
  userAgent: string;
  maxTouchPoints: number;
  standalone: boolean;
}): Device {
  // iPadOS asks for desktop sites, so it says Macintosh; only its touch screen tells.
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  return {
    ios,
    iosSafari: ios && /Safari\//.test(userAgent) && !NOT_SAFARI.test(userAgent),
    installed: standalone,
  };
}

/** Whether this device gets push notifications, as far as the browser can tell. */
export type PushState = "checking" | "unsupported" | "blocked" | "off" | "on";

/** The cards the Feed can show. */
export type FeedPrompt = "install-iphone" | "install-android" | "turn-on";

/** The cards a person can put off for later: installing, and notifications. */
export type PutOffCard = "install" | "notifications";

export type FeedPromptFacts = {
  device: Device;
  push: PushState;
  /** The browser offered its install prompt (`beforeinstallprompt`): Android Chrome, mostly. */
  canPromptInstall: boolean;
  /** The cards the person put off for later on this device. */
  putOff: Record<PutOffCard, boolean>;
};

/**
 * The cards the Feed shows, in order. On iPhone outside the installed app,
 * notifications can't work, so it only asks to install first. Elsewhere it
 * offers the browser's install prompt where there is one, and notifications
 * while they're off. None once both are done, or put off.
 */
export function feedPrompts({ device, push, canPromptInstall, putOff }: FeedPromptFacts): FeedPrompt[] {
  if (push === "checking") return [];
  const installing = !device.installed && !putOff.install;
  if (device.ios && !device.installed) return installing ? ["install-iphone"] : [];

  const prompts: FeedPrompt[] = [];
  if (installing && canPromptInstall) prompts.push("install-android");
  if (push === "off" && !putOff.notifications) prompts.push("turn-on");
  return prompts;
}

/** How long "Later" keeps a card away. */
const LATER_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether a card put off at `stored` (milliseconds, as kept in the browser) is still away at `now`. */
export function isPutOff(stored: string | null, now: Date): boolean {
  const at = Number(stored);
  return stored !== null && Number.isFinite(at) && now.getTime() - at < LATER_MS;
}
