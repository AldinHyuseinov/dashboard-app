import Link from "next/link";
import { listCategorySections, type Category } from "@/lib/categories";
import { ChevronRightIcon } from "@/components/shell/icons";

/**
 * Every Category as a tappable list: Venues as a heading over its
 * Categories, then the standalone Categories. Venues itself is never offered.
 */
export default function CategoryList({ hrefFor }: { hrefFor: (slug: string) => string }) {
  return (
    <div className="flex flex-col gap-3">
      {listCategorySections().map((section) => (
        <section key={section.heading} aria-label={section.heading} className="flex flex-col gap-1">
          {/* Only a Category Group's heading is shown; the rest need no label on screen. */}
          {section.isGroup && <h2 className="eyebrow px-1 text-ink-2">{section.heading}</h2>}
          <Rows categories={section.categories} hrefFor={hrefFor} />
        </section>
      ))}
    </div>
  );
}

function Rows({
  categories,
  hrefFor,
}: {
  categories: readonly Category[];
  hrefFor: (slug: string) => string;
}) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {categories.map((category) => (
        <li key={category.slug}>
          <Link
            href={hrefFor(category.slug)}
            className="flex min-h-7 items-center gap-2 px-2 text-body font-medium text-ink transition-colors hover:bg-hover focus-visible:-outline-offset-2"
          >
            <span className="flex-1">{category.label}</span>
            <ChevronRightIcon size={18} className="shrink-0 text-ink-2" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
