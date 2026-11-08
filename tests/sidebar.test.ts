import { describe, expect, it } from "vitest";
import {
  SIDEBAR_COOKIE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_COOKIE,
  clampSidebarWidth,
  readSidebarHidden,
  readSidebarWidth,
  sidebarCookie,
  sidebarWidthCookie,
} from "@/lib/sidebar";

describe("The sidebar's width", () => {
  it("is the usual width until the person drags it", () => {
    expect(readSidebarWidth(undefined)).toBe(SIDEBAR_WIDTH.default);
  });

  it("keeps the width the browser kept", () => {
    expect(readSidebarWidth("300")).toBe(300);
  });

  it("is the usual width when the stored value isn't a whole number", () => {
    expect(readSidebarWidth("")).toBe(SIDEBAR_WIDTH.default);
    expect(readSidebarWidth("wide")).toBe(SIDEBAR_WIDTH.default);
    expect(readSidebarWidth("300.5")).toBe(SIDEBAR_WIDTH.default);
    expect(readSidebarWidth("-300")).toBe(SIDEBAR_WIDTH.default);
  });

  it("never goes narrower or wider than the limits", () => {
    expect(readSidebarWidth("10")).toBe(SIDEBAR_WIDTH.min);
    expect(readSidebarWidth("99999")).toBe(SIDEBAR_WIDTH.max);
    expect(clampSidebarWidth(SIDEBAR_WIDTH.min - 1)).toBe(SIDEBAR_WIDTH.min);
    expect(clampSidebarWidth(SIDEBAR_WIDTH.max + 1)).toBe(SIDEBAR_WIDTH.max);
    expect(clampSidebarWidth(287.6)).toBe(288);
  });

  it("is kept in a cookie that reads back the same", () => {
    const cookie = sidebarWidthCookie(320);
    expect(cookie).toContain(`${SIDEBAR_WIDTH_COOKIE}=320`);
    expect(cookie).toContain("path=/");
    expect(cookie).toMatch(/max-age=\d{7,}/);
  });
});

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
