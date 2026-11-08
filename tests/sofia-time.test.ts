import { describe, expect, it } from "vitest";
import { whenShort } from "@/lib/sofia-time";

// Sofia is two hours ahead of UTC in November: this is Wednesday 4 November, 14:30 there.
const NOW = new Date("2026-11-04T12:30:00Z");

describe("Sofia time", () => {
  it("names today and yesterday, and otherwise the date, with the year only when it isn't this one", () => {
    expect(whenShort(new Date("2026-11-04T07:05:00Z"), NOW)).toBe("днес, 09:05");
    expect(whenShort(new Date("2026-11-03T15:12:00Z"), NOW)).toBe("вчера, 17:12");
    expect(whenShort(new Date("2026-10-10T09:00:00Z"), NOW)).toBe("10 октомври");
    expect(whenShort(new Date("2025-10-10T09:00:00Z"), NOW)).toBe("10 октомври 2025 г.");
  });

  it("counts days in Sofia, not UTC: 00:30 there is already the next day", () => {
    expect(whenShort(new Date("2026-11-03T22:30:00Z"), NOW)).toBe("днес, 00:30");
    expect(whenShort(new Date("2026-11-02T22:30:00Z"), NOW)).toBe("вчера, 00:30");
  });
});
