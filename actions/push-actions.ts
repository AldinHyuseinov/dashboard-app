"use server";

import { notifications } from "@/lib/notifications";
import type { PushTarget } from "@/lib/push-adapter";
import { requireActor, requireActorSession } from "@/lib/session";

/**
 * Turns notifications on in this browser, from the push subscription it
 * handed over (`PushSubscription.toJSON()`; the module checks it). Signing
 * out turns them off.
 */
export async function turnOnPushAction(
  subscription: PushTarget,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { actor, sessionId } = await requireActorSession();
  return notifications.registerDevice(actor, { ...subscription, sessionId, now: new Date() });
}

/** Turns notifications off in the browser whose push subscription has `endpoint`. */
export async function turnOffPushAction(endpoint: string): Promise<void> {
  const actor = await requireActor();
  await notifications.unregisterDevice(actor, String(endpoint));
}
