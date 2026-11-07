import Link from "next/link";

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

  const linkClass = (disabled: boolean) =>
    `px-4 py-3 border rounded-md text-xs font-bold transition-all ${
      disabled
        ? "pointer-events-none opacity-40 border-gray-200 text-gray-400"
        : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100 hover:border-primary-gold"
    }`;

  return (
    <div className="flex justify-center items-center gap-2 mb-2 pt-2 border-t border-gray-100">
      <Link href={pageHref(currentPage - 1)} className={linkClass(currentPage <= 1)}>
        ◄
      </Link>

      <span className="text-xs font-bold text-gray-500 tracking-wider">
        Страница {currentPage} от {totalPages}
      </span>

      <Link href={pageHref(currentPage + 1)} className={linkClass(currentPage >= totalPages)}>
        ►
      </Link>
    </div>
  );
}
