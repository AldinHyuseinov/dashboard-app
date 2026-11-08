import Link from "next/link";
import { BackIcon, ChevronRightIcon } from "@/components/shell/icons";

/** Previous and next page links with "page X of Y", shown only when there is more than one page. */
export default function Pagination({
  currentPage,
  totalPages,
  pageHref,
}: {
  currentPage: number;
  totalPages: number;
  pageHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Страници" className="flex items-center justify-center gap-2">
      <PageLink href={pageHref(currentPage - 1)} disabled={currentPage <= 1} label="Предишна страница">
        <BackIcon size={20} />
      </PageLink>
      <span className="text-meta font-semibold text-ink-2">
        Страница {currentPage} от {totalPages}
      </span>
      <PageLink href={pageHref(currentPage + 1)} disabled={currentPage >= totalPages} label="Следваща страница">
        <ChevronRightIcon size={20} />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = "btn-ghost size-touch px-0";
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${className} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
