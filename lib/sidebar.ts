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

/** The cookie holding how wide this browser keeps the sidebar. */
export const SIDEBAR_WIDTH_COOKIE = "sidebar-width";

/** The sidebar's width in px, and how far it can be dragged either way. */
export const SIDEBAR_WIDTH = { default: 256, min: 200, max: 400 } as const;

/** The nearest width the sidebar may have. */
export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, Math.round(width)));
}

/** The width the browser kept; the usual width when there is none, or it's not a whole number. */
export function readSidebarWidth(stored: string | undefined): number {
  if (stored === undefined || !/^\d+$/.test(stored)) return SIDEBAR_WIDTH.default;
  return clampSidebarWidth(Number(stored));
}

/** The `document.cookie` string for a width. */
export function sidebarWidthCookie(width: number): string {
  return `${SIDEBAR_WIDTH_COOKIE}=${clampSidebarWidth(width)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/** The longest browsers keep a cookie. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

/**
 * The `document.cookie` string for a choice. Hiding is kept for as long as
 * browsers allow; showing removes the cookie, since no cookie means shown.
 */
export function sidebarCookie(hidden: boolean): string {
  const maxAge = hidden ? COOKIE_MAX_AGE : 0;
  return `${SIDEBAR_COOKIE}=${hidden ? "hidden" : ""}; path=/; max-age=${maxAge}; samesite=lax`;
}
