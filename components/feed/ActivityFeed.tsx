"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { olderFeedItemsAction } from "@/actions/activity-actions";
import type { FeedItem, FeedPage } from "@/lib/activity";
import { feedSections } from "@/lib/feed-view";
import { navItem } from "@/lib/navigation";
import { PlusIcon } from "@/components/shell/icons";
import FeedRow from "./FeedRow";

/** How loading the older items is going. */
type OlderLoad = "idle" | "loading" | "failed";

/**
 * The Activity Feed's items in sections: what's new, then by day. Older
 * items load as the end of the list scrolls into view, or from the button
 * there, and stay under their day. `now` is when the Feed was read, so its days don't shift on the
 * device. A refresh of the screen gives a new `newest` and starts again.
 */
export default function ActivityFeed({
  newest,
  viewerId,
  now,
}: {
  newest: FeedPage;
  viewerId: string;
  now: Date;
}) {
  const [shown, setShown] = useState({ newest, items: newest.items, older: newest.older });
  if (shown.newest !== newest) setShown({ newest, items: newest.items, older: newest.older });
  const [loading, setLoading] = useState<OlderLoad>("idle");

  const { items, older } = shown;
  const loadingRef = useRef(false);
  const loadOlder = useCallback(async () => {
    if (!older || loadingRef.current) return;
    loadingRef.current = true;
    setLoading("loading");
    try {
      const page = await olderFeedItemsAction(older);
      setShown((current) => {
        if (current.older !== older) return current; // Refreshed meanwhile.
        const seen = new Set(current.items.map((item) => item.id));
        const unseen = page.items.filter((item) => !seen.has(item.id));
        return { ...current, items: [...current.items, ...unseen], older: page.older };
      });
      setLoading("idle");
    } catch {
      setLoading("failed"); // Offline, or the server failed: offer to try again.
    } finally {
      loadingRef.current = false;
    }
  }, [older]);

  if (items.length === 0) return <EmptyFeed />;

  return (
    <div className="flex flex-col gap-3">
      {feedSections(items, now, { shownFirst: newest.items.length }).map((section, index) => (
        <section key={section.heading} aria-labelledby={`feed-section-${index}`} className="flex flex-col gap-1">
          <h2 id={`feed-section-${index}`} className="eyebrow px-1 text-ink-2">
            {section.heading}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {section.entries.map(({ item, time }) => (
              <li key={item.id}>
                <FeedRow item={item} time={time} viewerId={viewerId} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <FeedEnd hasOlder={older !== null} loading={loading} onLoadOlder={loadOlder} items={items} />
    </div>
  );
}

/**
 * The end of the list: older items load once it comes near the screen,
 * with what's happening said in words. With nothing older, the Feed says so.
 */
function FeedEnd({
  hasOlder,
  loading,
  onLoadOlder,
  items,
}: {
  hasOlder: boolean;
  loading: OlderLoad;
  onLoadOlder: () => void;
  items: FeedItem[];
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = end.current;
    if (!hasOlder || loading !== "idle" || !target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadOlder();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
    // `items` changes after each load: if the end is still in view, observe it afresh.
  }, [hasOlder, loading, onLoadOlder, items]);

  return (
    <div ref={end} className="flex min-h-7 flex-col items-center justify-center gap-1 text-center">
      <p role="status" className="text-secondary text-ink-2">
        {!hasOlder
          ? "Това е всичко в активността."
          : loading === "loading"
            ? "Зареждане на по-старите…"
            : loading === "failed"
              ? "По-старите не се заредиха. Проверете връзката."
              : ""}
      </p>
      {hasOlder && loading !== "loading" && (
        <button type="button" onClick={onLoadOlder} className="btn-ghost">
          {loading === "failed" ? "Опитайте отново" : "Покажи по-стари"}
        </button>
      )}
    </div>
  );
}

/** Before anything has happened: what will appear here, and how to start. */
function EmptyFeed() {
  const newTask = navItem("new-task");
  return (
    <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-surface p-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-body font-semibold">Все още няма активност</h2>
        <p className="text-secondary text-ink-2">
          Тук ще виждате новите задачи, промените по тях и коментарите на колегите, най-новите най-отгоре.
        </p>
      </div>
      <Link href={newTask.href} className="btn-gold">
        <PlusIcon size={18} />
        Създайте първата задача
      </Link>
    </div>
  );
}
