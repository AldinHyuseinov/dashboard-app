/**
 * Feed view: how the Activity Feed reads on screen. What each item says
 * someone did, and the sections it falls into (what's new, then by day)
 * with the times shown, in Sofia time.
 */

import type { ActivityType, FeedItem } from "@/lib/activity";
import { calendarDate, dayOf, isDayBefore, timeOfDay, whenShort } from "@/lib/sofia-time";

/** What happened, after the Actor's name: someone else's action, then the viewer's own. */
const DID: Record<Exclude<ActivityType, "reply-posted">, readonly [string, string]> = {
  "task-created": ["създаде задача", "създадохте задача"],
  "task-edited": ["редактира задача", "редактирахте задача"],
  "task-deleted": ["изтри задача", "изтрихте задача"],
  "task-done": ["отбеляза като готова", "отбелязахте като готова"],
  "task-not-done": ["отбеляза като неготова", "отбелязахте като неготова"],
  "comment-posted": ["коментира", "коментирахте"],
};

const firstName = (name: string) => name.trim().split(/\s+/)[0];

/**
 * Who did what, for the person `viewerId` looking at the Feed: "Вие" for
 * their own actions, and for a Reply, whose Comment it answered.
 */
export function describeActivity(item: FeedItem, viewerId: string): { who: string; did: string } {
  const isOwn = item.actor.id === viewerId;
  const who = isOwn ? "Вие" : item.actor.name;
  if (item.type !== "reply-posted") return { who, did: DID[item.type][isOwn ? 1 : 0] };

  const answered = item.comment?.repliesTo;
  if (!answered || answered.id === item.actor.id) return { who, did: isOwn ? "отговорихте" : "отговори" };
  if (answered.id === viewerId) return { who, did: "ви отговори" };
  return { who, did: `${isOwn ? "отговорихте" : "отговори"} на ${firstName(answered.name)}` };
}

/** A run of Feed items under one heading, each with the time to show beside it. */
export type FeedSection = {
  readonly heading: string;
  readonly entries: readonly { readonly item: FeedItem; readonly time: string }[];
};

/**
 * The Feed's items in sections, as of `now`: Unread items first under
 * "Ново за вас", then the rest under their day. Only the first `shownFirst`
 * items (those on screen when the Feed opened) are gathered under "Ново за
 * вас"; Unread items loaded later, by scrolling, stay under their day, still
 * marked, where the person is reading. Within a day only the time is shown;
 * a new item from an earlier day also names its day.
 */
export function feedSections(
  items: readonly FeedItem[],
  now: Date,
  { shownFirst = items.length }: { shownFirst?: number } = {},
): FeedSection[] {
  const isNew = (item: FeedItem, index: number) => item.unread && index < shownFirst;
  const sections: { heading: string; entries: { item: FeedItem; time: string }[] }[] = [];

  const newItems = items.filter(isNew);
  if (newItems.length > 0) {
    sections.push({
      heading: "Ново за вас",
      entries: newItems.map((item) => ({
        item,
        time: dayOf(item.occurredAt) === dayOf(now) ? timeOfDay(item.occurredAt) : whenShort(item.occurredAt, now),
      })),
    });
  }

  items.forEach((item, index) => {
    if (isNew(item, index)) return;
    const heading = dayHeading(item.occurredAt, now, { afterNew: newItems.length > 0 });
    const last = sections.at(-1);
    const entry = { item, time: timeOfDay(item.occurredAt) };
    if (last && last.heading === heading) last.entries.push(entry);
    else sections.push({ heading, entries: [entry] });
  });
  return sections;
}

function dayHeading(date: Date, now: Date, { afterNew }: { afterNew: boolean }): string {
  if (dayOf(date) === dayOf(now)) return afterNew ? "По-рано днес" : "Днес";
  if (isDayBefore(date, now)) return "Вчера";
  return calendarDate(date, now);
}
