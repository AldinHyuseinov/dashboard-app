/**
 * The Unread count in berry, the one red in the UI. Shows nothing when there
 * is nothing Unread.
 */
export default function UnreadBadge({
  count,
  className = "",
}: {
  count: number | undefined;
  className?: string;
}) {
  if (!count) return null;

  return (
    <span
      className={`inline-flex h-2.5 min-w-2.5 items-center justify-center rounded-full bg-berry px-0.5 text-[11px] font-bold leading-none text-on-berry ${className}`}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> непрочетени</span>
    </span>
  );
}
