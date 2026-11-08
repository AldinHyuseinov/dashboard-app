/**
 * Push in the browser: the service worker, whether this device gets push,
 * turning notifications on and off for it, and the badge on the app's icon.
 * Client-side only. Used by the Profile switch and the Feed's card.
 */

import { useEffect, useState } from "react";
import { turnOffPushAction, turnOnPushAction } from "@/actions/push-actions";
import type { PushState } from "@/lib/app-prompts";
import type { PushTarget } from "@/lib/push-adapter";

/** Whether this browser can receive push at all. */
export function browserSupportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * Registers the service worker, which shows the notifications pushes bring
 * and the No connection screen. Every screen does it on loading, so it's in
 * place before the connection drops.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  await registerServiceWorker();
  return navigator.serviceWorker.ready;
}

/** This browser's push subscription, if it has one. Registers nothing. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Whether this device gets push. On only when the browser has a subscription
 * the server has on for this session (`sessionEndpoints`); `vapidPublicKey`
 * is null when push isn't set up on the server.
 */
export async function checkPushState(
  vapidPublicKey: string | null,
  sessionEndpoints: string[],
): Promise<Exclude<PushState, "checking">> {
  if (!vapidPublicKey || !browserSupportsPush()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const subscription = await currentSubscription();
  return subscription && sessionEndpoints.includes(subscription.endpoint) ? "on" : "off";
}

/**
 * Whether this device gets push, checked once the screen is in the browser
 * ("checking" until then), and a way to say it changed.
 */
export function usePushState(vapidPublicKey: string | null, sessionEndpoints: string[]) {
  const [state, setState] = useState<PushState>("checking");
  useEffect(() => {
    let cancelled = false;
    checkPushState(vapidPublicKey, sessionEndpoints).then(
      (checked) => !cancelled && setState(checked),
      () => !cancelled && setState("off"),
    );
    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey, sessionEndpoints]);
  return [state, setState] as const;
}

/** The outcome of turning notifications on. */
export type TurnOnResult = "on" | "blocked" | "dismissed" | { error: string };

/**
 * Turns notifications on for this device: asks for permission (call it only
 * from the person's tap), subscribes to push with the server's key and
 * registers the subscription.
 */
export async function turnOnPush(vapidPublicKey: string): Promise<TurnOnResult> {
  // First, while the tap still counts as the person's action: Safari asks only then.
  const permission = await Notification.requestPermission();
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "dismissed";

  const registration = await serviceWorker();
  const key = base64UrlBytes(vapidPublicKey);
  let subscription = await registration.pushManager.getSubscription();
  // One made with an earlier key would refuse every push the server sends now.
  if (subscription && !sameBytes(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  });
  const result = await turnOnPushAction(subscription.toJSON() as PushTarget);
  return result.ok ? "on" : { error: result.error };
}

function sameBytes(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.byteLength) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((byte, i) => byte === b[i]);
}

/** Turns notifications off for this device, here and on the server. */
export async function turnOffPush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await turnOffPushAction(subscription.endpoint);
  await subscription.unsubscribe();
}

/** A VAPID public key, as the bytes `pushManager.subscribe` takes. */
function base64UrlBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/**
 * Drops this browser's push subscription, on signing out. The server forgets
 * the device by itself when the session ends; this leaves nothing behind in
 * the browser for the next person. Never fails: signing out goes ahead.
 */
export async function forgetPushSubscription(): Promise<void> {
  try {
    if (!browserSupportsPush()) return;
    await (await currentSubscription())?.unsubscribe();
  } catch {
    // Nothing more to do: the server no longer pushes to it.
  }
}

/**
 * The Unread count on the app's icon, cleared at none. Only an installed app
 * has an icon to badge; elsewhere, or where badges aren't supported, nothing
 * happens. Never fails.
 */
export async function showUnreadOnIcon(count: number): Promise<void> {
  try {
    if (!("setAppBadge" in navigator)) return;
    if (count > 0) await navigator.setAppBadge(count);
    else await navigator.clearAppBadge();
  } catch {
    // Badges turned off for the app: nothing to show it on.
  }
}
