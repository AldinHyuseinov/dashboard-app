import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "@/app/api/seed-users/route";
import { auth } from "@/lib/auth";
import { canSignIn as canSignInWith } from "./support/auth";

const SECRET = "s3cret-seed";
const URL = "http://localhost:3000/api/seed-users";
const STAFF = [
  { name: "Ivan", email: "ivan@avexim.test", password: "Staro!123" },
  { name: "Maria", email: "maria@avexim.test", password: "Staro!456" },
];

/**
 * The seed route adds the staff accounts listed in the environment. The
 * secret travels in a request header on a POST, never in the URL.
 */
describe("Seed route", () => {
  beforeEach(() => {
    vi.stubEnv("SEED_SECRET", SECRET);
    vi.stubEnv("PREDETERMINED_USERS", JSON.stringify(STAFF));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function seed(init: { headers?: Record<string, string>; url?: string } = {}) {
    return route.POST(new Request(init.url ?? URL, { method: "POST", headers: init.headers }));
  }

  function canSignIn(email: string, password: string) {
    return canSignInWith(auth, email, password);
  }

  it("adds the listed staff when the secret is in the header", async () => {
    const response = await seed({ headers: { "x-seed-secret": SECRET } });

    expect(response.status).toBe(200);
    expect((await response.json()).summary).toEqual({ total: 2, success: 2, skipped: 0, failed: 0 });
    expect(await canSignIn("ivan@avexim.test", "Staro!123")).toBe(true);
    expect(await canSignIn("maria@avexim.test", "Staro!456")).toBe(true);
  });

  it("skips staff who already have an account", async () => {
    await seed({ headers: { "x-seed-secret": SECRET } });

    const response = await seed({ headers: { "x-seed-secret": SECRET } });

    expect((await response.json()).summary).toEqual({ total: 2, success: 0, skipped: 2, failed: 0 });
  });

  it.each([
    ["no secret", {}],
    ["a wrong secret", { headers: { "x-seed-secret": "guess" } }],
    ["the secret only in the URL", { url: `${URL}?secret=${SECRET}` }],
  ])("refuses a request with %s", async (_, init) => {
    const response = await seed(init);

    expect(response.status).toBe(401);
    expect(await canSignIn("ivan@avexim.test", "Staro!123")).toBe(false);
  });

  it("refuses everyone when no secret is configured", async () => {
    vi.stubEnv("SEED_SECRET", "");

    const response = await seed({ headers: { "x-seed-secret": "" } });

    expect(response.status).toBe(401);
  });

  it("answers only POST, so Next.js refuses a GET", () => {
    expect(Object.keys(route)).toEqual(["POST"]);
  });
});
