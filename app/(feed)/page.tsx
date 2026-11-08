import Alert from "@/components/notification/Alert";
import ActivityFeed from "@/components/feed/ActivityFeed";
import FeedPrompt from "@/components/feed/FeedPrompt";
import { MarkFeedSeen } from "@/components/shell/UnreadCount";
import { activity } from "@/lib/activity";
import { notifications } from "@/lib/notifications";
import { vapidPublicKey } from "@/lib/push";
import { getActorSession } from "@/lib/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Avexim Communication | Активност",
};

/**
 * The Activity Feed: the first screen after signing in, and the installed
 * app's start screen. Its Unread items are marked as of the last visit, and
 * once it's on show, this visit is recorded. Above it, a card may ask to
 * install the app or turn notifications on.
 */
export default async function Home() {
  const signedIn = await getActorSession();
  if (!signedIn) {
    redirect("/login?not-authorized=true");
  }
  const { actor, sessionId } = signedIn;

  // Taken before the Feed is read: anything newer may be missing from it, so stays Unread.
  const shownAt = new Date();
  const [newest, unreadCount, sessionEndpoints] = await Promise.all([
    activity.feed(actor, {}),
    activity.unreadCount(actor),
    notifications.sessionEndpoints(actor, sessionId),
  ]);

  // Phones: the title, the cards, then the Feed. Desktop: the cards in a column on the right.
  return (
    <div className="flex w-full max-w-90 flex-col gap-3 px-2 pt-3 pb-4 lg:grid lg:max-w-130 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start lg:gap-x-6 lg:gap-y-4 lg:px-6 lg:pt-1">
      <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1 lg:gap-4">
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
      </div>

      <aside aria-label="За това устройство" className="empty:hidden lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <FeedPrompt vapidPublicKey={vapidPublicKey()} sessionEndpoints={sessionEndpoints} />
      </aside>

      <div className="lg:col-start-1 lg:row-start-2">
        <MarkFeedSeen shownAt={shownAt} />
        <ActivityFeed newest={newest} viewerId={actor.id} now={shownAt} />
      </div>
    </div>
  );
}
