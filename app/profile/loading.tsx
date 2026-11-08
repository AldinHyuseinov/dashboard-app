/** The Profile while it loads: its title, and grey cards where its sections will be. */
export default function Loading() {
  return (
    <div className="flex w-full max-w-[1040px] flex-col gap-3 px-2 pt-3 pb-4 lg:gap-4 lg:px-6 lg:pt-1">
      <h1 className="screen-title">Профил</h1>
      <p role="status" className="sr-only">
        Зареждане на профила…
      </p>
      <div
        aria-hidden="true"
        className="grid gap-3 motion-safe:animate-pulse lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:gap-4"
      >
        <div className="flex flex-col gap-3 lg:gap-4">
          <span className="h-[280px] rounded-card border border-line bg-surface" />
          <span className="h-[320px] rounded-card border border-line bg-surface" />
        </div>
        <div className="flex flex-col gap-3 lg:gap-4">
          <span className="h-[120px] rounded-card border border-line bg-surface" />
          <span className="h-[120px] rounded-card border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}
