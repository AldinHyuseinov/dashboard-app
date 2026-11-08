import webpush, { WebPushError } from "web-push";

/** Where a push goes: one browser's push subscription, as the browser gave it. */
export type PushTarget = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** What a push notification shows, and the screen tapping it opens. */
export type PushNotification = {
  title: string;
  body: string;
  /** A path in the app, such as `/tasks/abc`. */
  url: string;
};

/** One outgoing push, to a single device. */
export type PushMessage = {
  to: PushTarget;
  notification: PushNotification;
  /** The recipient's Unread count, for the badge on the app's icon. */
  unread: number;
};

/**
 * The push service refused a device for good: its subscription expired or
 * was withdrawn (the person revoked permission, cleared site data or
 * uninstalled). Nothing will ever reach it again.
 */
export class PushDeviceGone extends Error {
  constructor(readonly endpoint: string) {
    super(`The push service no longer accepts ${endpoint}`);
    this.name = "PushDeviceGone";
  }
}

/**
 * Push sending abstraction — the seam for the notification module, shaped
 * like the EmailAdapter.
 *
 * `send` throws {@link PushDeviceGone} when the device will never accept a
 * push again, and any other error for a failure that may pass.
 *
 * Implementations:
 *   - WebPushAdapter     — Web Push with VAPID keys (production)
 *   - InMemoryPushAdapter — captures pushes so tests can read them
 */
export interface PushAdapter {
  send(message: PushMessage): Promise<void>;
}

/**
 * Keeps every push in memory instead of sending it. Inject it wherever a
 * PushAdapter is accepted, then assert on `sent`. Call `expire(endpoint)` to
 * have the push service refuse that device from then on.
 */
export class InMemoryPushAdapter implements PushAdapter {
  readonly sent: PushMessage[] = [];
  private readonly gone = new Set<string>();

  expire(endpoint: string): void {
    this.gone.add(endpoint);
  }

  async send({ to, notification, unread }: PushMessage): Promise<void> {
    if (this.gone.has(to.endpoint)) throw new PushDeviceGone(to.endpoint);
    this.sent.push({
      to: { endpoint: to.endpoint, keys: { ...to.keys } },
      notification: { ...notification },
      unread,
    });
  }
}

/** The VAPID keys and contact Web Push identifies this server with. */
export type VapidDetails = {
  /** A `mailto:` or `https:` contact the push services can reach the maintainer at. */
  subject: string;
  publicKey: string;
  privateKey: string;
};

/**
 * The VAPID details from VAPID_SUBJECT, VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY, or `null` when any is missing.
 */
export function vapidFromEnv(env: NodeJS.ProcessEnv = process.env): VapidDetails | null {
  const { VAPID_SUBJECT: subject, VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = env;
  if (!subject || !publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

/** How long a push service keeps trying to deliver to a device that is offline. */
const PUSH_TTL_SECONDS = 24 * 60 * 60;

/** Push service answers meaning the subscription is gone for good. */
const GONE_STATUSES = new Set([404, 410]);

/**
 * Web Push adapter: encrypts each notification for its device and hands it
 * to the browser's push service, signed with the VAPID keys. Without keys
 * (VAPID_* unset) every send fails, and is logged by the caller.
 */
export class WebPushAdapter implements PushAdapter {
  constructor(private readonly vapid: VapidDetails | null = vapidFromEnv()) {}

  async send({ to, notification, unread }: PushMessage): Promise<void> {
    if (!this.vapid) throw new Error("Push is not configured: set VAPID_SUBJECT, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
    try {
      // What public/sw.js reads: { title, body, url, unread }.
      await webpush.sendNotification(to, JSON.stringify({ ...notification, unread }), {
        vapidDetails: this.vapid,
        TTL: PUSH_TTL_SECONDS,
      });
    } catch (error) {
      if (error instanceof WebPushError && GONE_STATUSES.has(error.statusCode)) {
        throw new PushDeviceGone(to.endpoint);
      }
      throw error;
    }
  }
}
