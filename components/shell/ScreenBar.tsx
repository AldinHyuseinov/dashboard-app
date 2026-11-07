"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { screenAt } from "@/lib/navigation";
import { BackIcon } from "./icons";
import Logo from "./Logo";
import RefreshButton from "./RefreshButton";

/**
 * The bar above every screen. On phones it's the gold top bar with the logo,
 * kept clear of the notch. Below the top level it leads with a back link to
 * the parent screen; on desktop, where the sidebar carries the logo, only the
 * back link and the refresh button remain.
 */
export default function ScreenBar() {
  const { back } = screenAt(usePathname());

  return (
    <header className="on-bar safe-top sticky top-0 z-30 border-b border-bar-line bg-bar text-bar-ink lg:static lg:border-0 lg:bg-transparent lg:pt-2 lg:text-ink">
      <div className="safe-x flex h-7 items-center justify-between gap-2 lg:px-6">
        {back ? (
          <Link
            href={back.href}
            className="-ml-1 inline-flex min-h-touch min-w-0 items-center gap-0.5 rounded-full pr-1 pl-0.5 text-secondary font-semibold tracking-[1px] lg:text-ink-2 lg:hover:text-ink"
          >
            <BackIcon size={22} className="shrink-0" />
            <span className="truncate">{back.label}</span>
          </Link>
        ) : (
          <Link href="/" className="inline-flex min-h-touch items-center rounded-sm lg:hidden">
            <Logo height={28} eager />
          </Link>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {back && (
            <span className="lg:hidden">
              <Logo height={22} />
            </span>
          )}
          <RefreshButton />
        </div>
      </div>
    </header>
  );
}
