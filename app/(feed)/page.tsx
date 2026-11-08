import Alert from "@/components/notification/Alert";
import ActivityFeed from "@/components/feed/ActivityFeed";
import { MarkFeedSeen } from "@/components/shell/UnreadCount";
import { activity } from "@/lib/activity";
import { getActor } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Avexim Communication | Активност",
};

/**
 * The Activity Feed: the first screen after signing in. Its Unread items are
 * marked as of the last visit, and once it's on show, this visit is recorded.
 */
export default async function Home() {
  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  // Taken before the Feed is read: anything newer may be missing from it, so stays Unread.
  const shownAt = new Date();
  const [newest, unreadCount] = await Promise.all([
    activity.feed(actor, {}),
    activity.unreadCount(actor),
  ]);

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-3 px-2 pt-3 pb-4 lg:gap-4 lg:px-6 lg:pt-1">
      <Suspense fallback={null}>
        <Alert />
      </Suspense>

      <div className="flex items-baseline justify-between gap-2">
        <h1 className="screen-title">Активност</h1>
        {unreadCount > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-meta text-ink-2 lg:text-secondary">
            <span aria-hidden="true" className="size-1 rounded-full bg-berry" />
            {unreadCount} {unreadCount === 1 ? "ново" : "нови"}
          </span>
        )}
      </div>

      <MarkFeedSeen shownAt={shownAt} />
      <ActivityFeed newest={newest} viewerId={actor.id} now={shownAt} />
    </div>
  );
}
