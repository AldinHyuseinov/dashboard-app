import { describe, expect, it } from "vitest";
import { SIDEBAR_COOKIE, readSidebarHidden, sidebarCookie } from "@/lib/sidebar";

describe("The sidebar's shown or hidden choice", () => {
  it("is shown until the person hides it", () => {
    expect(readSidebarHidden(undefined)).toBe(false);
  });

  it("is hidden when the browser kept it hidden", () => {
    expect(readSidebarHidden("hidden")).toBe(true);
  });

  it("is shown when the stored value isn't one it knows", () => {
    expect(readSidebarHidden("")).toBe(false);
    expect(readSidebarHidden("shown")).toBe(false);
    expect(readSidebarHidden("Hidden")).toBe(false);
    expect(readSidebarHidden("1")).toBe(false);
  });

  describe("the cookie the toggle writes", () => {
    it("keeps the choice for a long time when hiding", () => {
      const cookie = sidebarCookie(true);
      expect(cookie).toContain(`${SIDEBAR_COOKIE}=hidden`);
      expect(cookie).toContain("path=/");
      expect(cookie).toMatch(/max-age=\d{7,}/);
    });

    it("is read back as hidden", () => {
      const value = sidebarCookie(true).split(";")[0].split("=")[1];
      expect(readSidebarHidden(value)).toBe(true);
    });

    it("removes itself when showing again, so a missing cookie means shown", () => {
      const cookie = sidebarCookie(false);
      expect(cookie).toContain(`${SIDEBAR_COOKIE}=;`);
      expect(cookie).toContain("max-age=0");
    });
  });
});
