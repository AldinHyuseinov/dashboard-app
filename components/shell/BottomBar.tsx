"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, screenAt, type NavItemId } from "@/lib/navigation";
import { CategoriesIcon, FeedIcon, PlusIcon, ProfileIcon } from "./icons";
import UnreadBadge from "./UnreadBadge";
import { useUnreadCount } from "./UnreadCount";

const ICONS: Record<Exclude<NavItemId, "new-task">, typeof FeedIcon> = {
  feed: FeedIcon,
  categories: CategoriesIcon,
  profile: ProfileIcon,
};

/**
 * The phone's bottom bar: Feed, Categories, New task and Profile, kept clear
 * of the home bar. Hidden on desktop, where the sidebar takes over.
 */
export default function BottomBar() {
  const { navItem } = screenAt(usePathname());
  const unreadCount = useUnreadCount();

  return (
    <nav
      aria-label="Основна навигация"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pt-1 lg:hidden"
    >
      <ul className="mx-auto grid max-w-80 grid-cols-4 pl-[max(8px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))]">
        {NAV_ITEMS.map((item) => {
          const isCurrent = item.id === navItem;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex min-h-6 flex-col items-center justify-center gap-0.5 rounded-tile text-label ${
                  isCurrent ? "font-semibold text-gold-ink" : "font-medium text-ink-2"
                }`}
              >
                {item.id === "new-task" ? (
                  <span className="-my-0.5 flex size-4 items-center justify-center rounded-full bg-gold text-on-gold">
                    <PlusIcon size={20} />
                  </span>
                ) : (
                  <TabIcon id={item.id} unreadCount={item.id === "feed" ? unreadCount : undefined} />
                )}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabIcon({
  id,
  unreadCount,
}: {
  id: Exclude<NavItemId, "new-task">;
  unreadCount: number | undefined;
}) {
  const TabGlyph = ICONS[id];
  return (
    <span className="relative flex">
      <TabGlyph />
      <UnreadBadge
        count={unreadCount}
        className="absolute -top-0.75 -right-1.5 border-2 border-surface"
      />
    </span>
  );
}
