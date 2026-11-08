"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { listCategorySections, type Category } from "@/lib/categories";
import { navItem, screenAt } from "@/lib/navigation";
import { initials } from "@/lib/utils";
import { FeedIcon, PlusIcon } from "./icons";
import Logo from "./Logo";
import { useSidebar } from "./ShellFrame";
import SidebarResizer from "./SidebarResizer";
import UnreadBadge from "./UnreadBadge";
import { useUnreadCount } from "./UnreadCount";

/**
 * The desktop sidebar: the logo, New task, the Feed and every Category
 * (Venues' Categories under their heading, then the rest), and the Profile.
 * Hidden on phones, where the bottom bar takes over. On desktop it can also
 * be hidden with the toggle (see ShellFrame) and dragged wider or narrower.
 */
export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const unreadCount = useUnreadCount();
  const screen = screenAt(pathname);

  const feed = navItem("feed");
  const newTask = navItem("new-task");
  const profile = navItem("profile");

  const { hidden, resizing } = useSidebar();

  return (
    // The slot is as wide as the sidebar and narrows to nothing when hidden,
    // so the screen takes the room; the sidebar slides out within it. While
    // dragging, the width follows the pointer without easing.
    <div
      className={`relative hidden shrink-0 overflow-clip lg:block ${
        hidden ? "lg:w-0" : "lg:w-(--sidebar-width)"
      } ${resizing ? "" : "transition-[width] duration-200 ease-out"}`}
    >
      <aside
        id="sidebar"
        // Hidden is out of the tab order and away from screen readers.
        inert={hidden}
        className={`on-bar sticky top-0 flex h-dvh w-(--sidebar-width) flex-col overflow-y-auto bg-bar text-bar-ink transition-transform duration-200 ease-out ${
          hidden ? "-translate-x-full" : ""
        }`}
      >
        {/* The toggle sits at the top-left: the logo starts clear of it. */}
        <div className="flex h-7 shrink-0 items-center pl-8">
          <Link href={feed.href} className="rounded-sm">
            <Logo height={32} eager />
          </Link>
        </div>

        <div className="flex flex-1 flex-col gap-3 pt-2 pr-3 pb-3 pl-[max(16px,env(safe-area-inset-left))]">
          <Link
            href={newTask.href}
            aria-current={screen.navItem === "new-task" ? "page" : undefined}
            className="flex min-h-touch items-center justify-center gap-1 rounded-full border-2 border-new-task-line bg-new-task text-secondary font-semibold tracking-[1px] text-on-new-task hover:brightness-110"
          >
            <PlusIcon size={18} />
            {newTask.label}
          </Link>

          <nav aria-label="Основна навигация" className="flex flex-col gap-2">
            <SideLink href={feed.href} isCurrent={screen.navItem === "feed"}>
              <FeedIcon size={20} />
              <span className="flex-1">{feed.label}</span>
              <UnreadBadge count={unreadCount} />
            </SideLink>

            {listCategorySections().map((section) => (
              <CategorySection
                key={section.heading}
                heading={section.heading}
                categories={section.categories}
                pathname={pathname}
              />
            ))}
          </nav>

          <SideLink
            href={profile.href}
            isCurrent={screen.navItem === "profile"}
            className="mt-auto"
          >
            <span
              aria-hidden="true"
              className="-ml-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-side-new text-[11px] font-bold text-on-side-new"
            >
              {initials(userName)}
            </span>
            <span className="min-w-0 truncate">{userName}</span>
            <span className="sr-only">, {profile.label}</span>
          </SideLink>
        </div>
      </aside>

      {!hidden && <SidebarResizer />}
    </div>
  );
}

function SideLink({
  href,
  isCurrent,
  className = "",
  children,
}: {
  href: string;
  isCurrent: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={`flex min-h-5 items-center gap-2 rounded-tile px-2 text-secondary font-semibold hover:bg-side-active aria-[current=page]:bg-side-active ${className}`}
    >
      {children}
    </Link>
  );
}

function CategorySection({
  heading,
  categories,
  pathname,
}: {
  heading: string;
  categories: readonly Category[];
  pathname: string;
}) {
  return (
    <section className="flex flex-col gap-0.5">
      <h2 className="eyebrow px-2 text-side-eyebrow">{heading}</h2>
      <ul className="flex flex-col gap-0.5">
        {categories.map((category) => {
          const href = `/category/${category.slug}`;
          // The Category's own list is the page; its Tasks and forms sit inside it.
          const ariaCurrent =
            pathname === href ? "page" : pathname.startsWith(`${href}/`) ? "true" : undefined;
          return (
            <li key={category.slug}>
              <Link
                href={href}
                aria-current={ariaCurrent}
                className="flex min-h-4.5 items-center rounded-tile px-2 text-secondary font-medium hover:bg-side-active aria-[current]:bg-side-active aria-[current]:font-semibold"
              >
                {category.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
