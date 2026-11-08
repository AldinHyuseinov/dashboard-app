/**
 * Installing the app, in the browser: the device it's open on, the
 * browser's own install prompt (Android Chrome), and the Feed cards a person
 * put off for later. Client-side only, apart from the capture script.
 */

import { isPutOff, readDevice, type Device, type PutOffCard } from "@/lib/app-prompts";

/** Chrome's install prompt, which `beforeinstallprompt` hands over. Not in TypeScript's DOM types. */
type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    /** The browser's install prompt, kept by {@link CAPTURE_INSTALL_PROMPT} until it's used. */
    __aveximInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

/** Fired on `window` whenever the install prompt comes or goes. */
const INSTALL_PROMPT_CHANGED = "avexim:install-prompt";

/**
 * Runs in the page's `<head>`, before React: Chrome offers its install
 * prompt once, early, often before the app has started. Keeps it for the
 * Feed's card instead of Chrome's own banner, and forgets it once the app is
 * installed.
 */
export const CAPTURE_INSTALL_PROMPT = `
window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  window.__aveximInstallPrompt = event;
  window.dispatchEvent(new Event("${INSTALL_PROMPT_CHANGED}"));
});
window.addEventListener("appinstalled", function () {
  window.__aveximInstallPrompt = null;
  window.dispatchEvent(new Event("${INSTALL_PROMPT_CHANGED}"));
});
`;

/** Calls `onChange` whenever the install prompt comes or goes; returns the unsubscribe. */
export function subscribeInstallPrompt(onChange: () => void): () => void {
  window.addEventListener(INSTALL_PROMPT_CHANGED, onChange);
  return () => window.removeEventListener(INSTALL_PROMPT_CHANGED, onChange);
}

/** Whether the browser offered its install prompt and it hasn't been used. */
export function canPromptInstall(): boolean {
  return Boolean(window.__aveximInstallPrompt);
}

/**
 * Shows the browser's install prompt (call it only from the person's tap).
 * It can be shown once, so it's forgotten whatever they answer.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = window.__aveximInstallPrompt;
  if (!prompt) return "unavailable";
  window.__aveximInstallPrompt = null;
  window.dispatchEvent(new Event(INSTALL_PROMPT_CHANGED));
  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}

/** The device the app is open on, and whether it was opened from the home screen. */
export function thisDevice(): Device {
  const standalone =
    window.matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return readDevice({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, standalone });
}

const putOffKey = (card: PutOffCard) => `avexim:later:${card}`;

/** Whether `card` was put off on this device recently. Storage blocked: it wasn't. */
export function isCardPutOff(card: PutOffCard): boolean {
  try {
    return isPutOff(localStorage.getItem(putOffKey(card)), new Date());
  } catch {
    return false;
  }
}

/** Puts `card` off for later on this device. Storage blocked: it's gone until the next visit. */
export function putCardOff(card: PutOffCard): void {
  try {
    localStorage.setItem(putOffKey(card), String(Date.now()));
  } catch {
    // Nothing to keep it in.
  }
}
