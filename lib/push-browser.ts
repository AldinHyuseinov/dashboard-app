/**
 * Push in the browser: whether it can receive push, and turning
 * notifications on and off for this device. Client-side only. The Profile
 * switch uses it now, and the Feed's notifications card later.
 */

import { turnOffPushAction, turnOnPushAction } from "@/actions/push-actions";
import type { PushTarget } from "@/lib/push-adapter";

/** Whether this browser can receive push at all. */
export function browserSupportsPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Registers the service worker, which shows the notifications pushes bring. */
async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

/** This browser's push subscription, if it has one. Registers nothing. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
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
