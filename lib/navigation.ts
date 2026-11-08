/**
 * Navigation: the app's top-level destinations, and where every screen sits
 * among them. The bottom bar (phones), the sidebar (desktop) and the in-app
 * back link are built from this module.
 *
 * Back links go to the screen's parent, never to browser history: an
 * installed app opened from a notification has no history to go back to.
 */

import { getCategoryLabel } from "@/lib/categories";

export type NavItemId = "feed" | "categories" | "new-task" | "profile";

export type NavItem = { readonly id: NavItemId; readonly href: string; readonly label: string };

type BackLink = { readonly href: string; readonly label: string };

/** Where a screen sits: which navigation item it belongs to, and how to go back. */
export type Screen = {
  readonly navItem: NavItemId | null;
  /** In-app back navigation, or `null` on a top-level screen. */
  readonly back: BackLink | null;
};

/** A Task's screen. */
export function taskHref(task: { id: string; category: string }): string {
  return `/category/${task.category}/${task.id}`;
}

/** The top-level destinations, in display order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "feed", href: "/", label: "Активност" },
  { id: "categories", href: "/categories", label: "Категории" },
  { id: "new-task", href: "/new", label: "Нова задача" },
  { id: "profile", href: "/profile", label: "Профил" },
];

/** One of the top-level destinations. */
export function navItem(id: NavItemId): NavItem {
  return NAV_ITEMS.find((item) => item.id === id)!;
}

/** Where the screen at `pathname` sits in the navigation. */
export function screenAt(pathname: string): Screen {
  const segments = pathname.split("/").filter(Boolean);
  const path = "/" + segments.join("/");

  const topLevel = NAV_ITEMS.find((item) => item.href === path);
  if (topLevel) return { navItem: topLevel.id, back: null };

  const [section, category, taskOrAction, taskAction] = segments;
  // New task's second step, once the Category is chosen.
  if (section === "new" && category) {
    return { navItem: "new-task", back: { href: "/new", label: "Категория" } };
  }
  if (section === "category" && category) {
    const categoryHref = `/category/${category}`;
    const toCategory = { href: categoryHref, label: getCategoryLabel(category) ?? "Назад" };

    if (!taskOrAction) return { navItem: "categories", back: backTo("categories") };
    if (taskOrAction === "create") return { navItem: "new-task", back: toCategory };
    if (taskAction === "edit") {
      return {
        navItem: "categories",
        back: { href: `${categoryHref}/${taskOrAction}`, label: "Задача" },
      };
    }
    return { navItem: "categories", back: toCategory };
  }

  return { navItem: null, back: backTo("feed") };
}

function backTo(id: NavItemId): BackLink {
  const { href, label } = navItem(id);
  return { href, label };
}
