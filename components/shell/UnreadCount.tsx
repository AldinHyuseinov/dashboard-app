"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { markFeedSeenAction, markTaskOpenedAction } from "@/actions/activity-actions";
import { showUnreadOnIcon } from "@/lib/push-browser";

type UnreadCountState = { count: number; refresh: () => Promise<void> };

const UnreadCountContext = createContext<UnreadCountState>({ count: 0, refresh: async () => {} });

/**
 * Holds the navigation's Unread count. The shell's layout stays in place as
 * people move between screens, so the count it rendered goes stale: it is
 * fetched again on every screen change and after a screen marks things read.
 * The installed app's icon shows the same count, from opening the app or
 * bringing it back to the screen on (pushes update it in between, see
 * public/sw.js).
 */
export function UnreadCountProvider({
  initialCount,
  children,
}: {
  initialCount: number;
  children: React.ReactNode;
}) {
  const [count, setCount] = useState(initialCount);

  // A refresh of the whole screen renders the shell again, with a new count.
  const [renderedCount, setRenderedCount] = useState(initialCount);
  if (initialCount !== renderedCount) {
    setRenderedCount(initialCount);
    setCount(initialCount);
  }

  // Only the latest request may set the count, so an answer that was already
  // on its way before something was marked read can't bring back old news.
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    const response = await fetch("/api/unread-count", { cache: "no-store" });
    if (!response.ok) return;
    const { count: fresh }: { count: number } = await response.json();
    if (request === latestRequest.current) setCount(fresh);
  }, []);

  useEffect(() => {
    void showUnreadOnIcon(count);
  }, [count]);

  // An installed app brought back to the screen isn't loaded again: count afresh.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, [refresh]);

  const pathname = usePathname();
  const shownPathname = useRef(pathname);
  useEffect(() => {
    if (pathname === shownPathname.current) return;
    shownPathname.current = pathname;
    refresh().catch(() => {}); // Offline: keep the last count.
  }, [pathname, refresh]);

  return <UnreadCountContext value={{ count, refresh }}>{children}</UnreadCountContext>;
}

/** The signed-in user's Unread count. */
export function useUnreadCount(): number {
  return useContext(UnreadCountContext).count;
}

/**
 * Marks something read once its screen is on show, then updates the count.
 * It runs on the client, not while the server renders the screen, so a
 * prefetch can never mark anything read.
 */
function useMarkRead(mark: () => Promise<void>) {
  const { refresh } = useContext(UnreadCountContext);
  useEffect(() => {
    startTransition(async () => {
      await mark();
      await refresh().catch(() => {});
    });
  }, [mark, refresh]);
}

/** On the Feed: everything up to `shownAt`, when the Feed was read, is no longer Unread. */
export function MarkFeedSeen({ shownAt }: { shownAt: Date }) {
  const time = shownAt.getTime();
  useMarkRead(useCallback(() => markFeedSeenAction(new Date(time)), [time]));
  return null;
}

/** On a Task: its Activities up to `shownAt`, when it was read, are no longer Unread. */
export function MarkTaskOpened({ taskId, shownAt }: { taskId: string; shownAt: Date }) {
  const time = shownAt.getTime();
  useMarkRead(useCallback(() => markTaskOpenedAction(taskId, new Date(time)), [taskId, time]));
  return null;
}
