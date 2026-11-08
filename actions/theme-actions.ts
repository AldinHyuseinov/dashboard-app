"use server";

import { cookies } from "next/headers";
import { readTheme, THEME_COOKIE } from "@/lib/theme";

/**
 * Keeps this device's appearance. The screen comes back with the new
 * `data-theme` and status bar colour in the same round trip.
 */
export async function setThemeAction(choice: string): Promise<void> {
  const theme = readTheme(choice);
  const jar = await cookies();
  if (theme === "auto") {
    jar.delete(THEME_COOKIE);
    return;
  }
  jar.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400, // the longest browsers keep a cookie
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
