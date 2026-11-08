import type { MetadataRoute } from "next";

/** The brand gold (`--color-gold` in app/globals.css). */
const GOLD = "#cda349";

/**
 * The web app manifest, which makes AVEXIM installable: its name and icons
 * (made by scripts/make-icons.mjs), the gold for the status bar and the
 * splash screen, and opening on the Feed in a window of its own, without the
 * browser's address bar and buttons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AVEXIM",
    short_name: "AVEXIM",
    description: "Задачи, коментари и активност на екипа на AVEXIM.",
    lang: "bg",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    // The app's own window. ("fullscreen" would also hide the phone's status bar.)
    display: "standalone",
    theme_color: GOLD,
    background_color: GOLD,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
