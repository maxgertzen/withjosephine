import type { Metadata } from "next";
import { displayFont, bodyFont } from "@/lib/fonts.generated";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Josephine — Soul Readings",
    template: "%s | Josephine",
  },
  description:
    "Astrology and Akashic Record readings by Josephine. Discover your soul's blueprint, birth chart patterns, and spiritual guidance.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Josephine — Soul Readings",
    title: "Josephine — Soul Readings",
    description:
      "Astrology and Akashic Record readings by Josephine. Discover your soul's blueprint, birth chart patterns, and spiritual guidance.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="bg-j-cream text-j-text font-body antialiased">
        {children}
      </body>
    </html>
  );
}
