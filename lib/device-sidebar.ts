import { cookies } from "next/headers";
import { readSidebarHidden, SIDEBAR_COOKIE } from "@/lib/sidebar";

/** Whether this browser keeps the sidebar hidden, from its cookie. Server-side only. */
export async function deviceSidebarHidden(): Promise<boolean> {
  return readSidebarHidden((await cookies()).get(SIDEBAR_COOKIE)?.value);
}
