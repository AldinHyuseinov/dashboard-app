import { vapidFromEnv, WebPushAdapter } from "./push-adapter";

export type { PushAdapter } from "./push-adapter";

/** The production adapter: Web Push, with the VAPID keys from the environment. */
export const pushAdapter = new WebPushAdapter();

/** The key browsers subscribe to push with, or `null` when push isn't configured. */
export function vapidPublicKey(): string | null {
  return vapidFromEnv()?.publicKey ?? null;
}
