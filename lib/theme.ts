/**
 * Appearance: light, dark, or automatic (following the device's setting).
 * The choice belongs to the device, not the account, so it's kept in a
 * cookie. The root layout reads it, puts it on `<html data-theme>` (see the
 * dark tokens in app/globals.css) and colours the browser and status bar to
 * match.
 */

export type Theme = "light" | "auto" | "dark";

/** The cookie holding this device's choice. */
export const THEME_COOKIE = "theme";

/** The choices, in the order the Profile offers them. */
export const THEMES: readonly { readonly id: Theme; readonly label: string }[] = [
  { id: "light", label: "Светъл" },
  { id: "auto", label: "Автоматичен" },
  { id: "dark", label: "Тъмен" },
];

/** The choice stored in the cookie; automatic when there is none, or it's unknown. */
export function readTheme(stored: string | undefined): Theme {
  return THEMES.find((theme) => theme.id === stored)?.id ?? "auto";
}

/** The top bar's colour: `--color-bar` in app/globals.css, light and dark. Keep them alike. */
const BAR = { light: "#cda349", dark: "#1e1912" } as const;

/** The colour the browser and status bar take: the top bar's, in the chosen appearance. */
export function themeColor(theme: Theme): string | { media: string; color: string }[] {
  if (theme !== "auto") return BAR[theme];
  return [
    { media: "(prefers-color-scheme: light)", color: BAR.light },
    { media: "(prefers-color-scheme: dark)", color: BAR.dark },
  ];
}
