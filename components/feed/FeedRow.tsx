import Link from "next/link";
import type { FeedItem } from "@/lib/activity";
import { describeActivity } from "@/lib/feed-view";
import Avatar from "@/components/shell/Avatar";
import { TrashIcon } from "@/components/shell/icons";

/**
 * One Feed item: who did what and when, the Task's title and Category, and
 * the start of the Comment for Comments and Replies. Unread items carry the
 * berry dot and a bolder title. An item of a deleted Task can't be opened.
 * On phones the Category gets a line of its own; on desktop it follows
 * what happened.
 */
export default function FeedRow({
  item,
  time,
  viewerId,
}: {
  item: FeedItem;
  time: string;
  viewerId: string;
}) {
  const { who, did } = describeActivity(item, viewerId);
  const { task } = item;

  const content = (
    <>
      <Avatar name={item.actor.name} image={item.actor.image} size="feed" />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-1 text-meta text-ink-2 lg:gap-2 lg:text-secondary">
          <span className="min-w-0">
            <strong className="font-semibold text-ink">{who}</strong> {did}
            <span className="hidden lg:inline">
              {" · "}
              <span className={task.deleted ? undefined : "font-semibold text-gold-ink"}>
                {task.categoryLabel}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <time dateTime={item.occurredAt.toISOString()}>{time}</time>
            {item.unread && (
              <span role="img" aria-label="Непрочетено" className="size-1 shrink-0 rounded-full bg-berry" />
            )}
          </span>
        </span>

        <span
          className={`text-body wrap-break-word ${
            task.deleted
              ? "font-medium text-ink-2 line-through"
              : item.unread
                ? "font-bold"
                : "font-medium"
          }`}
        >
          {task.title}
        </span>

        {item.comment && (
          <span className="line-clamp-2 text-secondary whitespace-pre-line wrap-break-word text-ink-2 lg:line-clamp-none">
            {item.comment.excerpt}
          </span>
        )}

        {task.deleted ? (
          <span className="flex items-center gap-1 text-meta text-ink-2">
            <TrashIcon size={16} className="shrink-0" />
            Задачата е изтрита<span className="lg:hidden"> · {task.categoryLabel}</span>
          </span>
        ) : (
          <span className="text-meta font-semibold text-gold-ink lg:hidden">{task.categoryLabel}</span>
        )}
      </span>
    </>
  );

  const rowClass = "flex gap-2 p-2 lg:px-3";
  if (task.deleted) return <div className={rowClass}>{content}</div>;

  return (
    <Link
      href={`/category/${task.category}/${task.id}`}
      className={`${rowClass} transition-colors hover:bg-hover focus-visible:-outline-offset-2`}
    >
      {content}
    </Link>
  );
}
