import Link from "next/link";
import { listCategorySections, type Category } from "@/lib/categories";
import { ChevronRightIcon } from "@/components/shell/icons";

/**
 * Every Category as a tappable list: Venues as a heading over its
 * Categories, then the standalone Categories. Venues itself is never offered.
 * With `notDoneCounts`, each row shows how many of its Tasks aren't Done.
 */
export default function CategoryList({
  hrefFor,
  notDoneCounts,
}: {
  hrefFor: (slug: string) => string;
  notDoneCounts?: Readonly<Record<string, number>>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {listCategorySections().map((section) => (
        <section key={section.heading} aria-label={section.heading} className="flex flex-col gap-1">
          {/* Only a Category Group's heading is shown; the rest need no label on screen. */}
          {section.isGroup && <h2 className="eyebrow px-1 text-ink-2">{section.heading}</h2>}
          <Rows categories={section.categories} hrefFor={hrefFor} notDoneCounts={notDoneCounts} />
        </section>
      ))}
    </div>
  );
}

function Rows({
  categories,
  hrefFor,
  notDoneCounts,
}: {
  categories: readonly Category[];
  hrefFor: (slug: string) => string;
  notDoneCounts?: Readonly<Record<string, number>>;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {categories.map((category) => {
        const count = notDoneCounts ? (notDoneCounts[category.slug] ?? 0) : undefined;
        return (
          <li key={category.slug}>
            <Link
              href={hrefFor(category.slug)}
              aria-label={
                count === undefined
                  ? undefined
                  : `${category.label}, ${count} ${count === 1 ? "неготова задача" : "неготови задачи"}`
              }
              className="flex min-h-7 items-center gap-2 px-2 text-body font-medium text-ink transition-colors hover:bg-hover focus-visible:-outline-offset-2"
            >
              <span className="flex-1">{category.label}</span>
              {count !== undefined && (
                <span
                  aria-hidden="true"
                  className={`inline-flex h-3 min-w-3.5 shrink-0 items-center justify-center rounded-full px-1 text-label ${
                    count === 0 ? "font-medium text-ink-2" : "bg-tint font-bold text-gold-ink"
                  }`}
                >
                  {count}
                </span>
              )}
              <ChevronRightIcon size={18} className="shrink-0 text-ink-2" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
