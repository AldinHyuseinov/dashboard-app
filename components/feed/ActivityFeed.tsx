import Link from "next/link";
import type { ActivityType, FeedItem } from "@/lib/activity";
import { formatDate } from "@/lib/utils";

/** What the Actor did, as the sentence after their name. */
const ACTIONS: Record<ActivityType, string> = {
  "task-created": "създаде задача",
  "task-edited": "редактира задача",
  "task-deleted": "изтри задача",
  "task-done": "отбеляза като завършена задача",
  "task-not-done": "отбеляза като незавършена задача",
  "comment-posted": "написа коментар по задача",
  "reply-posted": "отговори на коментар по задача",
};

function FeedItemContent({ item }: { item: FeedItem }) {
  return (
    <>
      <p className="text-sm text-gray-700">
        <span className="font-bold text-gray-800">{item.actor.name}</span> {ACTIONS[item.type]}
      </p>
      <p
        className={`font-bold text-lg wrap-break-word ${
          item.task.deleted ? "text-gray-400 line-through" : "text-tertiary-brown"
        }`}
      >
        {item.task.title}
      </p>
      {item.comment && (
        <p className="text-sm text-gray-600 italic whitespace-pre-wrap wrap-break-word">
          „{item.comment.excerpt}“
        </p>
      )}
      <p className="mt-1 text-xs text-gray-400">
        <span className="font-bold text-primary-gold">{item.task.categoryLabel}</span> ·{" "}
        {formatDate(item.occurredAt)}
        {item.task.deleted && <span className="ml-1 font-bold text-red-500">· Задачата е изтрита</span>}
      </p>
    </>
  );
}

/** The Activity Feed's items, newest first. Items of an existing Task open it. */
export default function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-center">Все още няма активност.</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.id}>
          {item.task.deleted ? (
            <div className="block p-2 rounded-lg border bg-gray-50 border-gray-200 shadow-sm">
              <FeedItemContent item={item} />
            </div>
          ) : (
            <Link
              href={`/category/${item.task.category}/${item.task.id}`}
              className="block p-2 rounded-lg border bg-white border-secondary-gold-dark shadow-sm transition-all hover:border-primary-gold hover:shadow-lg"
            >
              <FeedItemContent item={item} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
