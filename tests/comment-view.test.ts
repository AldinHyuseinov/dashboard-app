import { describe, expect, it } from "vitest";
import type { Comment } from "@/lib/types";
import { commentActions, commentThreads, reactionChips, replyMention, unsavedId } from "@/lib/comment-view";

const IVAN = "ivan";
const MARIA = "maria";
const GEORGI = "georgi";
const NAMES: Record<string, string> = {
  [IVAN]: "Иван Георгиев",
  [MARIA]: "Мария Петрова",
  [GEORGI]: "Георги Димитров",
};

function comment({
  id,
  by = IVAN,
  at,
  parentId = null,
  answersId = null,
  isPinned = false,
  reactions = [],
  text = "Текст",
}: {
  id: string;
  by?: string;
  at: string;
  parentId?: string | null;
  answersId?: string | null;
  isPinned?: boolean;
  reactions?: [emoji: string, userId: string][];
  text?: string;
}): Comment {
  return {
    id,
    text,
    createdAt: new Date(at),
    userId: by,
    user: { name: NAMES[by] },
    parentId,
    answersId,
    isPinned,
    reactions: reactions.map(([emoji, userId], i) => ({
      id: `${id}-r${i}`,
      emoji,
      userId,
      user: { name: NAMES[userId] },
    })),
  };
}

const ids = (threads: { topLevel: Comment }[]) => threads.map((t) => t.topLevel.id);

describe("Comment view", () => {
  describe("threads", () => {
    const older = comment({ id: "older", at: "2026-11-01T10:00:00Z", reactions: [["👍", MARIA], ["❤️", GEORGI]] });
    const newer = comment({ id: "newer", at: "2026-11-03T10:00:00Z", reactions: [["👍", MARIA]] });
    const newest = comment({ id: "newest", at: "2026-11-04T10:00:00Z" });
    const pinned = comment({ id: "pinned", at: "2026-10-20T10:00:00Z", isPinned: true });

    it("puts the most reacted Comments first under top, newest first on a tie", () => {
      const tied = comment({ id: "tied", at: "2026-11-02T10:00:00Z", reactions: [["😮", IVAN]] });
      expect(ids(commentThreads([older, tied, newer, newest], "top"))).toEqual([
        "older",
        "newer",
        "tied",
        "newest",
      ]);
    });

    it("puts the newest Comments first under newest", () => {
      expect(ids(commentThreads([older, newer, newest], "newest"))).toEqual([
        "newest",
        "newer",
        "older",
      ]);
    });

    it("puts the Pinned Comment first in either order", () => {
      expect(ids(commentThreads([older, newest, pinned], "top"))[0]).toBe("pinned");
      expect(ids(commentThreads([older, newest, pinned], "newest"))[0]).toBe("pinned");
    });

    it("files Replies under their top-level Comment, oldest first", () => {
      const second = comment({ id: "second", at: "2026-11-02T12:00:00Z", parentId: "older", answersId: "first" });
      const first = comment({ id: "first", at: "2026-11-02T11:00:00Z", parentId: "older", answersId: "older" });

      const [thread] = commentThreads([second, older, first], "top");

      expect(thread.topLevel.id).toBe("older");
      expect(thread.replies.map((r) => r.id)).toEqual(["first", "second"]);
    });
  });

  describe("what someone may do with a Comment", () => {
    const top = comment({ id: "top", by: MARIA, at: "2026-11-01T10:00:00Z" });
    const reply = comment({ id: "reply", by: MARIA, at: "2026-11-01T11:00:00Z", parentId: "top" });

    it("lets the author edit and delete their own Comment", () => {
      expect(commentActions(top, { viewerId: MARIA, isTaskOwner: false })).toMatchObject({
        canEdit: true,
        canDelete: true,
      });
    });

    it("lets nobody else edit or delete it, not even the Task Owner", () => {
      expect(commentActions(top, { viewerId: IVAN, isTaskOwner: true })).toMatchObject({
        canEdit: false,
        canDelete: false,
      });
    });

    it("lets only the Task Owner pin, and only a top-level Comment", () => {
      expect(commentActions(top, { viewerId: IVAN, isTaskOwner: true }).canPin).toBe(true);
      expect(commentActions(top, { viewerId: MARIA, isTaskOwner: false }).canPin).toBe(false);
      expect(commentActions(reply, { viewerId: IVAN, isTaskOwner: true }).canPin).toBe(false);
    });

    it("lets anyone react to and reply to any Comment or Reply", () => {
      expect(commentActions(top, { viewerId: GEORGI, isTaskOwner: false })).toMatchObject({
        canReact: true,
        canReply: true,
      });
      expect(commentActions(reply, { viewerId: GEORGI, isTaskOwner: false })).toMatchObject({
        canReact: true,
        canReply: true,
      });
    });

    it("offers nothing on a Comment that isn't saved yet", () => {
      const unsaved = comment({ id: unsavedId(), by: GEORGI, at: "2026-11-01T12:00:00Z" });
      expect(commentActions(unsaved, { viewerId: GEORGI, isTaskOwner: true })).toEqual({
        canReact: false,
        canReply: false,
        canEdit: false,
        canDelete: false,
        canPin: false,
      });
    });
  });

  describe("whom a Reply answers", () => {
    const top = comment({ id: "top", by: GEORGI, at: "2026-11-01T10:00:00Z" });

    it("names the first name of the answered Comment's author", () => {
      const reply = comment({ id: "r1", by: IVAN, at: "2026-11-01T11:00:00Z", parentId: "top", answersId: "top", text: "Кое бяло?" });
      expect(replyMention(reply, [top, reply])).toEqual({ mention: "@Георги", text: "Кое бяло?" });
    });

    it("answers a Reply's author when it answers that Reply", () => {
      const first = comment({ id: "r1", by: IVAN, at: "2026-11-01T11:00:00Z", parentId: "top", answersId: "top" });
      const second = comment({ id: "r2", by: GEORGI, at: "2026-11-01T12:00:00Z", parentId: "top", answersId: "r1", text: "Совиньон блан." });
      expect(replyMention(second, [top, first, second])).toEqual({ mention: "@Иван", text: "Совиньон блан." });
    });

    it("answers the top-level Comment when the answered Reply is gone", () => {
      const reply = comment({ id: "r2", by: MARIA, at: "2026-11-01T12:00:00Z", parentId: "top", answersId: null, text: "Да." });
      expect(replyMention(reply, [top, reply])).toEqual({ mention: "@Георги", text: "Да." });
    });

    it("doesn't repeat a mention the text already starts with", () => {
      const reply = comment({ id: "r1", by: IVAN, at: "2026-11-01T11:00:00Z", parentId: "top", answersId: "top", text: "@Георги кое бяло?" });
      expect(replyMention(reply, [top, reply])).toEqual({ mention: "@Георги", text: "кое бяло?" });
    });

    it("keeps a different name the text starts with", () => {
      const reply = comment({ id: "r1", by: IVAN, at: "2026-11-01T11:00:00Z", parentId: "top", answersId: "top", text: "@Мария виж това" });
      expect(replyMention(reply, [top, reply])).toEqual({ mention: "@Георги", text: "@Мария виж това" });
    });

    it("names no one for a top-level Comment", () => {
      expect(replyMention(top, [top])).toBeNull();
    });
  });

  describe("Reaction chips", () => {
    it("counts each emoji once per person, in the order they first appeared, marking the viewer's own", () => {
      const reacted = comment({
        id: "c",
        at: "2026-11-01T10:00:00Z",
        reactions: [
          ["👏", MARIA],
          ["👍", IVAN],
          ["👏", GEORGI],
        ],
      });

      expect(reactionChips(reacted, IVAN)).toEqual([
        { emoji: "👏", count: 2, mine: false },
        { emoji: "👍", count: 1, mine: true },
      ]);
    });

    it("shows no chips without Reactions", () => {
      expect(reactionChips(comment({ id: "c", at: "2026-11-01T10:00:00Z" }), IVAN)).toEqual([]);
    });
  });
});
