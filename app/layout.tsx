import type { Metadata, Viewport } from "next";
import { Montserrat, Unbounded } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch and home bar; the shell pads its bars clear of them.
  viewportFit: "cover",
  // The browser and status bar take the top bar's colour.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#cda349" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1912" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg" className={`${montserrat.variable} ${unbounded.variable}`}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
