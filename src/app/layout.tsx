import "@/styles/globals.css";

import type { Viewport } from "next";
import { Suspense } from "react";

import { DelegatedTracking } from "@/components/DelegatedTracking";
import { DraftModeChrome } from "@/components/DraftModeChrome";
import { SiteAnalytics } from "@/components/SiteAnalytics";
import { styleProviderClassName } from "@/components/StyleProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${styleProviderClassName} bg-j-cream text-j-text font-body antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Suspense fallback={null}>
          <SiteAnalytics />
        </Suspense>
        <DelegatedTracking />
        <Suspense fallback={null}>
          <DraftModeChrome />
        </Suspense>
      </body>
    </html>
  );
}
