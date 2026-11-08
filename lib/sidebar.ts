/**
 * The desktop sidebar can be hidden. Like the appearance, the choice belongs
 * to the browser, not the account, so it's kept in a cookie. The shell reads
 * it on the server (the first render is already right, with no flicker); the
 * toggle writes it from the client.
 */

/** The cookie holding this browser's choice. */
export const SIDEBAR_COOKIE = "sidebar";

/** Whether the browser kept the sidebar hidden; shown when there is no cookie, or it's unknown. */
export function readSidebarHidden(stored: string | undefined): boolean {
  return stored === "hidden";
}

/**
 * The `document.cookie` string for a choice. Hiding is kept for as long as
 * browsers allow; showing removes the cookie, since no cookie means shown.
 */
export function sidebarCookie(hidden: boolean): string {
  const maxAge = hidden ? 60 * 60 * 24 * 400 : 0;
  return `${SIDEBAR_COOKIE}=${hidden ? "hidden" : ""}; path=/; max-age=${maxAge}; samesite=lax`;
}
