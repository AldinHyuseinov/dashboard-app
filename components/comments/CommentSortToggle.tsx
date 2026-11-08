"use client";

import type { SortMode } from "@/lib/types";

const OPTIONS: readonly { mode: SortMode; label: string }[] = [
  { mode: "top", label: "Топ" },
  { mode: "newest", label: "Най-нови" },
];

/** Top or newest Comments first; the Pinned Comment leads either way. */
export default function CommentSortToggle({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  return (
    <div role="group" aria-label="Подреди коментарите" className="flex shrink-0 rounded-full bg-line p-0.5">
      {OPTIONS.map(({ mode, label }) => {
        const on = value === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(mode)}
            className={`min-h-touch cursor-pointer rounded-full px-2 text-meta font-semibold transition-colors ${
              on ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
