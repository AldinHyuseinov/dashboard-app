import Alert from "@/components/notification/Alert";
import ActivityFeed from "@/components/feed/ActivityFeed";
import Pagination from "@/components/Pagination";
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
export default async function Home(props: { searchParams: Promise<{ page?: string }> }) {
  const actor = await getActor();
  if (!actor) {
    redirect("/login?not-authorized=true");
  }

  const searchParams = await props.searchParams;
  // Taken before the Feed is read: anything newer may be missing from it, so stays Unread.
  const shownAt = new Date();
  const feed = await activity.feed(actor, { page: Number(searchParams.page) });

  return (
    <div className="w-full max-w-3xl mx-auto mt-4 px-4 flex flex-col">
      <Suspense fallback={null}>
        <Alert />
      </Suspense>

      <div className="flex justify-center items-center mb-4 border-b border-primary-gold p-2">
        <h1 className="text-3xl font-bold text-tertiary-brown text-center">Активност</h1>
      </div>

      <MarkFeedSeen shownAt={shownAt} />
      <ActivityFeed items={feed.items} />

      <Pagination
        currentPage={feed.currentPage}
        totalPages={feed.totalPages}
        pageHref={(page) => `/?page=${page}`}
      />
    </div>
  );
}
