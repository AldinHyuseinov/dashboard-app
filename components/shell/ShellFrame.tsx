"use client";

import { createContext, useContext, useRef, useState } from "react";
import { clampSidebarWidth, sidebarCookie, sidebarWidthCookie } from "@/lib/sidebar";
import { SidebarIcon } from "./icons";
import { useUnreadCount } from "./UnreadCount";

type SidebarState = {
  hidden: boolean;
  /** Width in px. */
  width: number;
  /** True while the width is being dragged: it must follow the pointer without easing. */
  resizing: boolean;
  setResizing: (resizing: boolean) => void;
  /** Sets the width, kept within the limits. */
  setWidth: (width: number) => void;
  /** Keeps the current width for this browser. */
  saveWidth: () => void;
};

const SidebarContext = createContext<SidebarState>({
  hidden: false,
  width: 0,
  resizing: false,
  setResizing: () => {},
  setWidth: () => {},
  saveWidth: () => {},
});

/** Whether the desktop sidebar is hidden, how wide it is, and how to resize it. */
export function useSidebar(): SidebarState {
  return useContext(SidebarContext);
}

/**
 * The frame the sidebar and the screen sit in. It holds whether the desktop
 * sidebar is hidden and how wide it is (first from the browser's cookies, read
 * on the server) and puts the hidden state on `data-sidebar`, which the screen's
 * bar styles from. The toggle and the resizing switch straight away and write
 * their cookie.
 */
export default function ShellFrame({
  initialHidden,
  initialWidth,
  children,
}: {
  initialHidden: boolean;
  initialWidth: number;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const [width, setWidthState] = useState(initialWidth);
  const [resizing, setResizing] = useState(false);
  const latestWidth = useRef(initialWidth);
  const unreadCount = useUnreadCount();

  function toggle() {
    const next = !hidden;
    setHidden(next);
    document.cookie = sidebarCookie(next);
  }

  function setWidth(next: number) {
    latestWidth.current = clampSidebarWidth(next);
    setWidthState(latestWidth.current);
  }

  function saveWidth() {
    document.cookie = sidebarWidthCookie(latestWidth.current);
  }

  return (
    <SidebarContext value={{ hidden, width, resizing, setResizing, setWidth, saveWidth }}>
      <div
        data-sidebar={hidden ? "hidden" : "shown"}
        className="group/shell min-h-dvh lg:flex"
        style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}
      >
        {/* First in the tab order, ahead of the toggle. */}
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-surface px-2 py-1 text-secondary font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
        >
          Към съдържанието
        </a>

        {/*
          Top-left of the screen either way, and it stays put as the page
          scrolls. Shown, it sits bare on the sidebar's gold; hidden, it's a
          round chip, so it reads over whatever scrolls beneath it.
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
    </SidebarContext>
  );
}
