/*
 * AVEXIM service worker: shows each push notification, and opens the screen
 * it is about when tapped. It caches nothing.
 *
 * A push carries JSON from lib/notifications.ts: { title, body, url }, where
 * `url` is a path in the app (the Task, or the Feed for a deleted Task).
 */

// A new version takes over open pages straight away, so a tapped
// notification can navigate them.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const { title, body, url } = readPush(event);
  // Every push must show a notification, or the browser may stop delivering them.
  event.waitUntil(
    self.registration.showNotification(title, { body, lang: "bg", data: { url } }),
  );
});

/** What a push says, or a plain AVEXIM notification if it can't be read. */
function readPush(event) {
  try {
    const data = event.data?.json();
    if (data && typeof data.title === "string") {
      return { title: data.title, body: String(data.body ?? ""), url: String(data.url ?? "/") };
    }
  } catch {
    // Not JSON: fall through.
  }
  return { title: "AVEXIM", body: "", url: "/" };
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
