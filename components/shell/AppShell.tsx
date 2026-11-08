import { activity } from "@/lib/activity";
import { deviceSidebar } from "@/lib/device-sidebar";
import { getViewer } from "@/lib/session";
import BottomBar from "./BottomBar";
import ScreenBar from "./ScreenBar";
import ShellFrame from "./ShellFrame";
import Sidebar from "./Sidebar";
import { UnreadCountProvider } from "./UnreadCount";

/**
 * The frame around every screen. Signed in: the sidebar on desktop, the top
 * and bottom bars on phones. Signed out (sign-in, not found), the screen
 * stands on its own. The Feed's navigation item shows the Unread count. On
 * desktop the sidebar can be hidden; the browser's choice is read here so the
 * first render is already right.
 */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <main id="main" className="flex min-h-dvh flex-col">
        {children}
      </main>
    );
  }

  const sidebar = await deviceSidebar();

  return (
    <UnreadCountProvider initialCount={await activity.unreadCount(viewer)}>
      <ShellFrame initialHidden={sidebar.hidden} initialWidth={sidebar.width}>
        <Sidebar user={viewer} />

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
      </ShellFrame>
    </UnreadCountProvider>
  );
}
