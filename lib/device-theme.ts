import { cookies } from "next/headers";
import { readTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

/** This device's appearance, from its theme cookie. Server-side only. */
export async function deviceTheme(): Promise<Theme> {
  return readTheme((await cookies()).get(THEME_COOKIE)?.value);
}
