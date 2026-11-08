import { describe, expect, it } from "vitest";
import type { ActivityType, FeedItem } from "@/lib/activity";
import { describeActivity, feedSections } from "@/lib/feed-view";

const IVAN = { id: "ivan", name: "Иван Георгиев" };
const MARIA = { id: "maria", name: "Мария Петрова" };

// Sofia is two hours ahead of UTC in November: this is Wednesday 4 November, 14:30 there.
const NOW = new Date("2026-11-04T12:30:00Z");

let nextId = 1;
function item({
  type = "task-created",
  actor = IVAN,
  at = NOW,
  unread = false,
  repliesTo = null,
}: {
  type?: ActivityType;
  actor?: { id: string; name: string };
  at?: Date | string;
  unread?: boolean;
  repliesTo?: { id: string; name: string } | null;
} = {}): FeedItem {
  const isComment = type === "comment-posted" || type === "reply-posted";
  return {
    id: `activity-${nextId++}`,
    type,
    actor,
    occurredAt: new Date(at),
    task: { id: "task", title: "Задача", category: "bars", categoryLabel: "Барове", deleted: false },
    comment: isComment ? { id: "comment", excerpt: "Текст", repliesTo } : null,
    unread,
  };
}

describe("Feed view", () => {
  describe("who did what", () => {
    it.each<[ActivityType, string]>([
      ["task-created", "създаде задача"],
      ["task-edited", "редактира задача"],
      ["task-deleted", "изтри задача"],
      ["task-done", "отбеляза като готова"],
      ["task-not-done", "отбеляза като неготова"],
      ["comment-posted", "коментира"],
    ])("someone else's %s reads “%s” after their name", (type, did) => {
      expect(describeActivity(item({ type, actor: IVAN }), MARIA.id)).toEqual({ who: "Иван Георгиев", did });
    });

    it.each<[ActivityType, string]>([
      ["task-created", "създадохте задача"],
      ["task-edited", "редактирахте задача"],
      ["task-deleted", "изтрихте задача"],
      ["task-done", "отбелязахте като готова"],
      ["task-not-done", "отбелязахте като неготова"],
      ["comment-posted", "коментирахте"],
    ])("your own %s reads “Вие %s”", (type, did) => {
      expect(describeActivity(item({ type, actor: MARIA }), MARIA.id)).toEqual({ who: "Вие", did });
    });

    it("a Reply names, by first name, whose Comment it answers", () => {
      const reply = item({ type: "reply-posted", actor: IVAN, repliesTo: MARIA });
      expect(describeActivity(reply, "georgi")).toEqual({ who: "Иван Георгиев", did: "отговори на Мария" });
      expect(describeActivity(item({ type: "reply-posted", actor: MARIA, repliesTo: IVAN }), MARIA.id)).toEqual({
        who: "Вие",
        did: "отговорихте на Иван",
      });
    });

    it("a Reply to your Comment says it answered you", () => {
      const reply = item({ type: "reply-posted", actor: IVAN, repliesTo: MARIA });
      expect(describeActivity(reply, MARIA.id)).toEqual({ who: "Иван Георгиев", did: "ви отговори" });
    });

    it("a Reply to the author's own Comment just says they replied", () => {
      const reply = item({ type: "reply-posted", actor: IVAN, repliesTo: IVAN });
      expect(describeActivity(reply, MARIA.id)).toEqual({ who: "Иван Георгиев", did: "отговори" });
    });
  });

  describe("sections", () => {
    const headings = (items: FeedItem[]) =>
      feedSections(items, NOW).map((section) => [section.heading, section.entries.map((entry) => entry.time)]);

    it("puts Unread items first under “Ново за вас”, then the rest by day in Sofia time", () => {
      expect(
        headings([
          item({ at: "2026-11-04T12:00:00Z", unread: true }),
          item({ at: "2026-11-04T08:20:00Z" }),
          item({ at: "2026-11-03T22:30:00Z" }), // 00:30 on the 4th in Sofia
          item({ at: "2026-11-03T21:50:00Z", unread: true }), // 23:50 on the 3rd
          item({ at: "2026-11-03T15:12:00Z" }),
          item({ at: "2026-10-28T09:00:00Z" }),
          item({ at: "2025-12-31T10:00:00Z" }),
        ]),
      ).toEqual([
        ["Ново за вас", ["14:00", "вчера, 23:50"]],
        ["По-рано днес", ["10:20", "00:30"]],
        ["Вчера", ["17:12"]],
        ["28 октомври", ["11:00"]],
        ["31 декември 2025 г.", ["12:00"]],
      ]);
    });

    it("leaves Unread items loaded later, by scrolling, under their own day, still marked", () => {
      const openedWith = [item({ at: "2026-11-04T12:00:00Z", unread: true }), item({ at: "2026-11-03T15:12:00Z" })];
      const loadedLater = [item({ at: "2026-11-03T09:00:00Z", unread: true }), item({ at: "2026-10-28T09:00:00Z" })];

      const sections = feedSections([...openedWith, ...loadedLater], NOW, { shownFirst: openedWith.length });

      expect(sections.map((s) => [s.heading, s.entries.map((e) => [e.time, e.item.unread])])).toEqual([
        ["Ново за вас", [["14:00", true]]],
        ["Вчера", [["17:12", false], ["11:00", true]]],
        ["28 октомври", [["11:00", false]]],
      ]);
    });

    it("calls today “Днес” when nothing is new", () => {
      expect(headings([item({ at: "2026-11-04T08:20:00Z" })])).toEqual([["Днес", ["10:20"]]]);
    });

    it("has no sections when the Feed is empty", () => {
      expect(feedSections([], NOW)).toEqual([]);
    });
  });
});
