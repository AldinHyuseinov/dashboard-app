"use client";

import { createContext, useContext, useState } from "react";
import { sidebarCookie } from "@/lib/sidebar";
import { SidebarIcon } from "./icons";
import { useUnreadCount } from "./UnreadCount";

const SidebarHiddenContext = createContext(false);

/** Whether the desktop sidebar is hidden. */
export function useSidebarHidden(): boolean {
  return useContext(SidebarHiddenContext);
}

/**
 * The frame the sidebar and the screen sit in. It holds whether the desktop
 * sidebar is hidden (first from the browser's cookie, read on the server) and
 * puts it on `data-sidebar`, which the sidebar and the screen's bar style
 * from. The toggle switches straight away and writes the cookie.
 */
export default function ShellFrame({
  initialHidden,
  children,
}: {
  initialHidden: boolean;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const unreadCount = useUnreadCount();

  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.cookie = sidebarCookie(next);
  }

  return (
    <SidebarHiddenContext value={hidden}>
      <div data-sidebar={hidden ? "hidden" : "shown"} className="group/shell min-h-dvh lg:flex">
        {/* First in the tab order, ahead of the toggle. */}
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-surface px-2 py-1 text-secondary font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
        >
          Към съдържанието
        </a>

        {/*
          Top-left of the screen either way, and it stays put as the page
          scrolls. Shown, it sits bare on the sidebar's gold band; hidden, it's
          a round chip, so it reads over whatever scrolls beneath it.
        */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!hidden}
          aria-controls="sidebar"
          className="fixed top-1 left-1.5 z-40 hidden size-touch cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-ink-2 hover:text-ink group-data-[sidebar=shown]/shell:border-transparent group-data-[sidebar=shown]/shell:bg-transparent group-data-[sidebar=shown]/shell:text-bar-ink group-data-[sidebar=shown]/shell:hover:bg-bar-line group-data-[sidebar=shown]/shell:focus-visible:outline-bar-ink lg:flex"
        >
          <SidebarIcon size={22} />
          <span className="sr-only">
            {/* The label stays put; aria-expanded says whether the menu is out. */}
            Покажи или скрий менюто
            {hidden && unreadCount > 0 ? `, има непрочетени: ${unreadCount}` : ""}
          </span>
          {hidden && unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-0.75 right-0.75 size-1 rounded-full border-2 border-surface bg-berry box-content"
            />
          )}
        </button>

        {children}
      </div>
    </SidebarHiddenContext>
  );
}
