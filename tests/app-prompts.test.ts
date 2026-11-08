import { describe, expect, it } from "vitest";
import { feedPrompts, isPutOff, readDevice, type Device, type FeedPromptFacts } from "@/lib/app-prompts";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
  iphoneInstagram:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101",
  // iPadOS asks for desktop sites, so it says Macintosh; only its touch screen tells.
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
};

describe("Reading the device", () => {
  it("an iPhone in Safari, not installed", () => {
    expect(readDevice({ userAgent: UA.iphoneSafari, maxTouchPoints: 5, standalone: false })).toEqual({
      ios: true,
      iosSafari: true,
      installed: false,
    });
  });

  it("an iPhone in another browser or an app's own browser is iOS, but not Safari", () => {
    for (const userAgent of [UA.iphoneChrome, UA.iphoneInstagram]) {
      expect(readDevice({ userAgent, maxTouchPoints: 5, standalone: false })).toMatchObject({
        ios: true,
        iosSafari: false,
      });
    }
  });

  it("an iPad passing as a Mac is iOS; a Mac isn't", () => {
    expect(readDevice({ userAgent: UA.ipad, maxTouchPoints: 5, standalone: false }).ios).toBe(true);
    expect(readDevice({ userAgent: UA.macSafari, maxTouchPoints: 0, standalone: false }).ios).toBe(false);
  });

  it("Android is not iOS; opened from the home screen, it's installed", () => {
    expect(readDevice({ userAgent: UA.androidChrome, maxTouchPoints: 5, standalone: true })).toEqual({
      ios: false,
      iosSafari: false,
      installed: true,
    });
  });
});

describe("Which cards the Feed shows", () => {
  const iphoneInSafari: Device = { ios: true, iosSafari: true, installed: false };
  const installedIphone: Device = { ios: true, iosSafari: true, installed: true };
  const android: Device = { ios: false, iosSafari: false, installed: false };
  const installedAndroid: Device = { ios: false, iosSafari: false, installed: true };

  function facts(overrides: Partial<FeedPromptFacts>): FeedPromptFacts {
    return {
      device: android,
      push: "off",
      canPromptInstall: false,
      putOff: { install: false, notifications: false },
      ...overrides,
    };
  }

  it("nothing until it's known whether notifications are on", () => {
    expect(feedPrompts(facts({ push: "checking", device: iphoneInSafari }))).toEqual([]);
  });

  it("on iPhone outside the installed app, only asks to install first, as iPhone pushes only to the app", () => {
    expect(feedPrompts(facts({ device: iphoneInSafari, push: "unsupported" }))).toEqual(["install-iphone"]);
  });

  it("in the installed app on iPhone, asks to turn notifications on", () => {
    expect(feedPrompts(facts({ device: installedIphone, push: "off" }))).toEqual(["turn-on"]);
  });

  it("on Android, offers the browser's install prompt beside notifications, which work in the browser too", () => {
    expect(feedPrompts(facts({ device: android, canPromptInstall: true }))).toEqual(["install-android", "turn-on"]);
    expect(feedPrompts(facts({ device: android, canPromptInstall: false }))).toEqual(["turn-on"]);
  });

  it("never offers to install once installed", () => {
    expect(feedPrompts(facts({ device: installedAndroid, canPromptInstall: true, push: "on" }))).toEqual([]);
    expect(feedPrompts(facts({ device: installedIphone, push: "on" }))).toEqual([]);
  });

  it("no notifications card while they're on, blocked, or can't work in this browser", () => {
    for (const push of ["on", "blocked", "unsupported"] as const) {
      expect(feedPrompts(facts({ device: installedAndroid, push }))).toEqual([]);
    }
  });

  it("a card put off for later stays away, and the others still show", () => {
    const putOffInstall = { install: true, notifications: false };
    expect(feedPrompts(facts({ device: iphoneInSafari, push: "unsupported", putOff: putOffInstall }))).toEqual([]);
    expect(feedPrompts(facts({ canPromptInstall: true, putOff: putOffInstall }))).toEqual(["turn-on"]);
    expect(
      feedPrompts(facts({ canPromptInstall: true, putOff: { install: false, notifications: true } })),
    ).toEqual(["install-android"]);
  });
});

describe("Putting a card off for later", () => {
  const now = new Date("2026-11-08T12:00:00Z");

  it("keeps it away for a week", () => {
    expect(isPutOff(String(now.getTime() - 6 * 24 * 60 * 60 * 1000), now)).toBe(true);
    expect(isPutOff(String(now.getTime() - 8 * 24 * 60 * 60 * 1000), now)).toBe(false);
  });

  it("never put off, or stored as something else, it shows", () => {
    expect(isPutOff(null, now)).toBe(false);
    expect(isPutOff("soon", now)).toBe(false);
  });
});
