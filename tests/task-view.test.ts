import { describe, expect, it } from "vitest";
import { postedLine, wasUpdated } from "@/lib/task-view";

// Sofia is two hours ahead of UTC in November: this is Wednesday 4 November, 14:30 there.
const NOW = new Date("2026-11-04T12:30:00Z");

describe("Task view", () => {
  it("says when a Task was posted", () => {
    const created = new Date("2026-10-12T08:00:00Z");
    expect(postedLine({ createdAt: created, updatedAt: created }, NOW)).toBe("12 октомври");
  });

  it("adds when it was last updated", () => {
    const task = { createdAt: new Date("2026-10-12T08:00:00Z"), updatedAt: new Date("2026-11-04T07:05:00Z") };
    expect(postedLine(task, NOW)).toBe("12 октомври, обновена днес, 09:05");
  });

  it("doesn't count the moments a save takes as an update", () => {
    const task = { createdAt: new Date("2026-11-04T12:00:00Z"), updatedAt: new Date("2026-11-04T12:00:01.500Z") };
    expect(wasUpdated(task)).toBe(false);
    expect(postedLine(task, NOW)).toBe("днес, 14:00");
  });
});
