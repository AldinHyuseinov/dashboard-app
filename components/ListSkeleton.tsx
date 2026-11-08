/**
 * A screen's list while it loads: its title (a grey bar when it isn't known
 * yet), and grey rows where the items will be. `label` says what is loading,
 * for screen readers.
 */
export default function ListSkeleton({
  title,
  label,
  rows = 5,
  withAvatars = false,
}: {
  title?: string;
  label: string;
  rows?: number;
  withAvatars?: boolean;
}) {
  return (
    <div className="flex w-full max-w-90 flex-col gap-3 px-2 pt-3 pb-4 lg:gap-4 lg:px-6 lg:pt-1">
      <div className="flex flex-col gap-0.5">
        {title ? (
          <h1 className="screen-title">{title}</h1>
        ) : (
          <span aria-hidden="true" className="my-1 h-3 w-1/2 rounded-full bg-line motion-safe:animate-pulse" />
        )}
      </div>
      <p role="status" className="sr-only">
        {label}
      </p>
      <ul
        aria-hidden="true"
        className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface motion-safe:animate-pulse"
      >
        {Array.from({ length: rows }, (_, row) => (
          <li key={row} className="flex gap-2 p-2 lg:px-3">
            {withAvatars && <span className="size-5 shrink-0 rounded-full bg-line" />}
            <span className="flex flex-1 flex-col gap-1 py-0.5">
              <span className="h-1.5 w-1/2 rounded-full bg-line" />
              <span className={`h-2 rounded-full bg-line ${row % 2 ? "w-3/4" : "w-5/6"}`} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
