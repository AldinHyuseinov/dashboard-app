import { getActor } from "@/lib/session";
import BottomBar from "./BottomBar";
import ScreenBar from "./ScreenBar";
import Sidebar from "./Sidebar";

/**
 * The frame around every screen. Signed in: the sidebar on desktop, the top
 * and bottom bars on phones. Signed out (sign-in, not found), the screen
 * stands on its own.
 */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const actor = await getActor();

  if (!actor) {
    return (
      <main id="main" className="flex min-h-dvh flex-col">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-surface px-2 py-1 text-secondary font-semibold text-ink focus:not-sr-only focus:fixed focus:top-1 focus:left-1"
      >
        Към съдържанието
      </a>

      <Sidebar userName={actor.name} />

      <div className="flex min-w-0 flex-1 flex-col">
        <ScreenBar />
        {/*
          Room below for the bottom bar (8 + 48 + home bar) on phones. Content
          too wide for the screen is clipped here, so it can never widen the
          page and push the fixed bars off screen.
        */}
        <main
          id="main"
          className="flex flex-1 flex-col items-center overflow-x-clip pr-[env(safe-area-inset-right)] pb-[calc(var(--spacing)*9+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] lg:px-0 lg:pb-8"
        >
          {children}
        </main>
      </div>

      <BottomBar />
    </div>
  );
}
