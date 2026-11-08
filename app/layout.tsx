import type { Metadata, Viewport } from "next";
import { Montserrat, Unbounded } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";
import { deviceTheme } from "@/lib/device-theme";
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
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
