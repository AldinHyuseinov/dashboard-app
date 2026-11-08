/*
 * AVEXIM service worker:
 *   - shows each push notification, and opens the screen it is about when tapped
 *   - puts the Unread count a push brings on the app's icon
 *   - without a connection, answers screens with the AVEXIM "No connection" screen
 *
 * It keeps nothing to read offline: the only cache holds the No connection
 * screen and its images. Screens always come from the server, and data and
 * everything else is left to the browser.
 *
 * A push carries JSON from WebPushAdapter (lib/push-adapter.ts), made by
 * lib/notifications.ts: { title, body, url, unread }, where `url` is a path
 * in the app (the Task, or the Feed for a deleted Task) and `unread` the
 * recipient's Unread count.
 *
 * Tests: tests/service-worker.test.ts.
 */

/** Bump it whenever the No connection screen or its images change, so devices fetch them again. */
const OFFLINE_CACHE = "avexim-offline-1";
const OFFLINE_SCREEN = "/offline.html";
/** The No connection screen and everything it shows. */
const OFFLINE_FILES = [OFFLINE_SCREEN, "/company-logo.png"];

const ICON = "/icons/icon-192.png";
/** The heart in white, for Android's status bar, which shows only its shape. */
const STATUS_BAR_ICON = "/icons/badge-96.png";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.addAll(OFFLINE_FILES);
      // A new version takes over open pages straight away, so a tapped
      // notification can navigate them.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== OFFLINE_CACHE).map((name) => caches.delete(name)));
      // The browser starts fetching a screen while this worker wakes up.
      await self.registration.navigationPreload?.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(screen(event));
    return;
  }
  // The No connection screen's own images, which must load without a connection.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && OFFLINE_FILES.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(() => offlineFile(url.pathname)));
  }
});

/** A screen from the server, or the No connection screen when it can't be reached. */
async function screen(event) {
  try {
    const preloaded = await event.preloadResponse;
    return preloaded ?? (await fetch(event.request));
  } catch {
    return offlineFile(OFFLINE_SCREEN);
  }
}

async function offlineFile(path) {
  return (await caches.match(path)) ?? Response.error();
}

self.addEventListener("push", (event) => {
  const { title, body, url, unread } = readPush(event);
  // Every push must show a notification, or the browser may stop delivering them.
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        lang: "bg",
        icon: ICON,
        badge: STATUS_BAR_ICON,
        data: { url },
      }),
      showUnread(unread),
    ]),
  );
});

/** What a push says, or a plain AVEXIM notification if it can't be read. */
function readPush(event) {
  try {
    const data = event.data?.json();
    if (data && typeof data.title === "string") {
      return {
        title: data.title,
        body: String(data.body ?? ""),
        url: String(data.url ?? "/"),
        unread: Number.isInteger(data.unread) && data.unread >= 0 ? data.unread : null,
      };
    }
  } catch {
    // Not JSON: fall through.
  }
  return { title: "AVEXIM", body: "", url: "/", unread: null };
}

/**
 * The Unread count on the app's icon, cleared at none. `null` (not known)
 * leaves it as it is. Where the browser has no badge, nothing happens.
 */
async function showUnread(unread) {
  if (unread === null) return;
  try {
    if (unread > 0) await self.navigator.setAppBadge?.(unread);
    else await self.navigator.clearAppBadge?.();
  } catch {
    // Not installed, or badges are off for the app: the notification still shows.
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(open(appUrl(event.notification.data?.url)));
});

/** `path` as a URL in this app; anything pointing elsewhere becomes the Feed. */
function appUrl(path) {
  const origin = self.location.origin;
  try {
    const url = new URL(path ?? "/", origin);
    return url.origin === origin ? url.href : `${origin}/`;
  } catch {
    return `${origin}/`;
  }
}

/** Shows `url` in an open window of the app if there is one, or in a new one. */
async function open(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    if (new URL(client.url).origin !== self.location.origin) continue;
    try {
      const focused = await client.focus();
      const navigated = await focused.navigate(url);
      if (navigated) return;
    } catch {
      // Not controlled by this worker, so it can't be navigated: try the next.
    }
  }
  await self.clients.openWindow(url);
}
