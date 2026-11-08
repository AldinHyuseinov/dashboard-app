import { cookies } from "next/headers";
import {
  readSidebarHidden,
  readSidebarWidth,
  SIDEBAR_COOKIE,
  SIDEBAR_WIDTH_COOKIE,
} from "@/lib/sidebar";

/** How this browser keeps the sidebar (hidden or not, and how wide), from its cookies. Server-side only. */
export async function deviceSidebar(): Promise<{ hidden: boolean; width: number }> {
  const jar = await cookies();
  return {
    hidden: readSidebarHidden(jar.get(SIDEBAR_COOKIE)?.value),
    width: readSidebarWidth(jar.get(SIDEBAR_WIDTH_COOKIE)?.value),
  };
}
