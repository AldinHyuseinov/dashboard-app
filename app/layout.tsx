import type { Metadata, Viewport } from "next";
import { Montserrat, Unbounded } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";
import ServiceWorker from "@/components/shell/ServiceWorker";
import { deviceTheme } from "@/lib/device-theme";
import { CAPTURE_INSTALL_PROMPT } from "@/lib/install-browser";
import { themeColor } from "@/lib/theme";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

/** Screen titles only: wide letters that echo the AVEXIM wordmark. */
const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["300"],
  variable: "--font-unbounded",
});

export const metadata: Metadata = {
  title: "Avexim Communication",
  description: "A management/communication app",
  applicationName: "AVEXIM",
  // iPhone: the home screen app's name and icon, and the top bar drawn under
  // the status bar (the shell pads it clear, see `safe-top` in app/globals.css).
  appleWebApp: { capable: true, title: "AVEXIM", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

/** The viewport, with the browser and status bar in the colours of this device's appearance. */
export async function generateViewport(): Promise<Viewport> {
  return {
    width: "device-width",
    initialScale: 1,
    // Draw under the notch and home bar; the shell pads its bars clear of them.
    viewportFit: "cover",
    // The browser and status bar take the top bar's colour.
    themeColor: themeColor(await deviceTheme()),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await deviceTheme();
  return (
    <html
      lang="bg"
      // Automatic has no attribute: the device's setting decides (app/globals.css).
      data-theme={theme === "auto" ? undefined : theme}
      className={`${montserrat.variable} ${unbounded.variable}`}
    >
      <head>
        {/*
          The browser offers its install prompt only once, early, so this runs
          as the page is read. (next/script's beforeInteractive would queue it
          until Next's own code has loaded.)
        */}
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_INSTALL_PROMPT }} />
      </head>
      <body className="font-sans">
        <ServiceWorker />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
