import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://avexim.test";
const SOURCE = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");

/** A request as the browser hands it to the worker. */
type FakeRequest = { url: string; mode: string; method: string };

function request(pathname: string, mode = "cors", method = "GET"): FakeRequest {
  return { url: `${ORIGIN}${pathname}`, mode, method };
}

/** The key a cache keeps a request or URL under: its path. */
function cacheKey(key: string | FakeRequest) {
  return new URL(typeof key === "string" ? key : key.url, ORIGIN).pathname;
}

/**
 * public/sw.js running in a stand-in for the browser's service worker
 * global: its events can be fired, and what it does to the caches, the
 * network, the notifications and the app's badge is recorded.
 */
function loadWorker() {
  const listeners = new Map<string, (event: unknown) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const network = { online: true, fetched: [] as string[] };

  async function fetchFake(input: string | FakeRequest) {
    const key = cacheKey(input);
    network.fetched.push(key);
    if (!network.online) throw new TypeError("Failed to fetch");
    // Static files come from public/, as the server sends them; screens are made up.
    const file = path.join(process.cwd(), "public", key);
    if (key !== "/" && existsSync(file)) return new Response(readFileSync(file));
    return new Response(`network ${key}`, { headers: { "Content-Type": "text/html" } });
  }

  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        async addAll(keys: string[]) {
          for (const key of keys) store.set(cacheKey(key), await fetchFake(key));
        },
        async put(key: string | FakeRequest, response: Response) {
          store.set(cacheKey(key), response);
        },
        async match(key: string | FakeRequest) {
          return store.get(cacheKey(key))?.clone();
        },
      };
    },
    async match(key: string | FakeRequest) {
      for (const store of stores.values()) {
        const found = store.get(cacheKey(key));
        if (found) return found.clone();
      }
      return undefined;
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name: string) {
      return stores.delete(name);
    },
  };

  const badge = { setAppBadge: vi.fn(async () => {}), clearAppBadge: vi.fn(async () => {}) };
  const registration = {
    showNotification: vi.fn(async () => {}),
    navigationPreload: { enable: vi.fn(async () => {}) },
  };
  const sandbox: Record<string, unknown> = {
    addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener),
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}), matchAll: vi.fn(async () => []), openWindow: vi.fn() },
    registration,
    location: new URL(`${ORIGIN}/sw.js`),
    navigator: badge,
    caches,
    fetch: fetchFake,
    URL,
    Response,
    console,
  };
  sandbox.self = sandbox;
  vm.runInNewContext(SOURCE, sandbox);

  /** Fires `type` at the worker; what it answered with and the work it waited for. */
  async function fire(type: string, fields: Record<string, unknown> = {}) {
    const waited: Promise<unknown>[] = [];
    let answer: Promise<Response> | undefined;
    const listener = listeners.get(type);
    if (!listener) throw new Error(`The worker doesn't listen for ${type}`);
    listener({
      ...fields,
      waitUntil: (work: Promise<unknown>) => waited.push(work),
      respondWith: (response: Promise<Response> | Response) => (answer = Promise.resolve(response)),
    });
    await Promise.all(waited);
    return { answer: answer && (await answer) };
  }

  /** Installs and activates the worker, as the browser does. */
  async function start() {
    await fire("install");
    await fire("activate");
    network.fetched.length = 0;
  }

  /** A navigation to `pathname`, as when a screen is opened or reloaded. */
  function navigate(pathname: string) {
    return fire("fetch", { request: request(pathname, "navigate"), preloadResponse: Promise.resolve(undefined) });
  }

  return { fire, start, navigate, network, stores, badge, registration, caches };
}

describe("The service worker", () => {
  let worker: ReturnType<typeof loadWorker>;

  beforeEach(async () => {
    worker = loadWorker();
    await worker.start();
  });

  describe("without a connection", () => {
    it("opening a screen shows the AVEXIM No connection screen", async () => {
      worker.network.online = false;

      const { answer } = await worker.navigate("/category/golf-clubs");

      const html = await answer!.text();
      expect(html).toContain("Няма връзка");
      expect(html).toContain('lang="bg"');
    });

    it("the No connection screen's images still load", async () => {
      const html = await (await worker.caches.match("/offline.html"))!.text();
      const images = [...html.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
      expect(images.length).toBeGreaterThan(0);
      worker.network.online = false;

      for (const src of images) {
        const { answer } = await worker.fire("fetch", { request: request(src, "no-cors") });
        expect(answer?.ok, src).toBe(true);
      }
    });
  });

  describe("with a connection", () => {
    it("screens come from the server, never from a cache", async () => {
      const { answer } = await worker.navigate("/");

      expect(await answer!.text()).toBe("network /");
      expect(worker.network.fetched).toEqual(["/"]);
    });

    it("uses the response the browser already started fetching, when there is one", async () => {
      const preloaded = new Response("preloaded /");

      const { answer } = await worker.fire("fetch", {
        request: request("/", "navigate"),
        preloadResponse: Promise.resolve(preloaded),
      });

      expect(await answer!.text()).toBe("preloaded /");
      expect(worker.network.fetched).toEqual([]);
    });

    it("leaves data and everything else to the browser", async () => {
      for (const other of [request("/api/unread-count"), request("/", "navigate", "POST"), request("/_next/static/app.js")]) {
        const { answer } = await worker.fire("fetch", { request: other });
        expect(answer, other.url).toBeUndefined();
      }
    });
  });

  describe("caching nothing for offline reading", () => {
    it("keeps only the No connection screen and its images", async () => {
      await worker.navigate("/");
      await worker.navigate("/category/golf-clubs");

      const kept = [...worker.stores.values()].flatMap((store) => [...store.keys()]);
      expect(kept).toContain("/offline.html");
      expect(kept.every((key) => key === "/offline.html" || key.startsWith("/icons/") || key.endsWith(".png"))).toBe(
        true,
      );
    });

    it("a new version clears the caches of earlier ones", async () => {
      const old = await worker.caches.open("avexim-offline-0");
      await old.put("/", new Response("old"));

      await worker.fire("activate");

      expect(await worker.caches.keys()).not.toContain("avexim-offline-0");
      expect(await worker.caches.match("/offline.html")).toBeDefined();
    });
  });

  describe("a push", () => {
    function push(data: unknown) {
      return worker.fire("push", { data: { json: () => data } });
    }

    it("shows the notification with the AVEXIM icon, opening its screen when tapped", async () => {
      await push({ title: "Мария коментира", body: "Нова винена листа", url: "/tasks/1", unread: 3 });

      expect(worker.registration.showNotification).toHaveBeenCalledWith(
        "Мария коментира",
        expect.objectContaining({
          body: "Нова винена листа",
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-96.png",
          data: { url: "/tasks/1" },
        }),
      );
    });

    it("puts the Unread count on the app's icon", async () => {
      await push({ title: "Мария коментира", body: "", url: "/tasks/1", unread: 3 });

      expect(worker.badge.setAppBadge).toHaveBeenCalledWith(3);
    });

    it("clears the icon's badge when nothing is Unread", async () => {
      await push({ title: "Мария реагира 👍", body: "", url: "/tasks/1", unread: 0 });

      expect(worker.badge.clearAppBadge).toHaveBeenCalled();
      expect(worker.badge.setAppBadge).not.toHaveBeenCalled();
    });

    it("leaves the badge alone when the push doesn't say the count", async () => {
      await push({ title: "AVEXIM", body: "", url: "/" });

      expect(worker.badge.setAppBadge).not.toHaveBeenCalled();
      expect(worker.badge.clearAppBadge).not.toHaveBeenCalled();
      expect(worker.registration.showNotification).toHaveBeenCalled();
    });
  });
});
