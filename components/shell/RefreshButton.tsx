"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshIcon } from "./icons";

/**
 * Reloads the current screen's content from the server. The installed app has
 * no browser reload button, so this is the way to pull in what's new.
 */
export default function RefreshButton() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startRefresh(() => router.refresh())}
      disabled={isRefreshing}
      aria-label={isRefreshing ? "Опресняване…" : "Опресни"}
      title="Опресни"
      className="inline-flex size-touch shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-bar-hover disabled:cursor-progress lg:hover:bg-hover"
    >
      <RefreshIcon size={22} className={isRefreshing ? "animate-spin" : undefined} />
    </button>
  );
}
