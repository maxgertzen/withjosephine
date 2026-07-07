import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

import { AnalyticsBootstrap } from "@/components/AnalyticsBootstrap";
import { DelegatedTracking } from "@/components/DelegatedTracking";
import { styleProviderClassName } from "@/components/StyleProvider";
import { siteOrigin } from "@/lib/env";
import { fetchSiteSettingsPublished } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // No draftMode()/headers() here: the root layout must stay static so public
  // pages can prerender. The Sanity live tree lives in src/app/preview/layout.tsx;
  // consent gating moved to a region cookie read client-side in AnalyticsBootstrap.
  const consentBannerContent = (await fetchSiteSettingsPublished())?.consentBanner ?? null;

  return (
    <html lang="en">
      <body
        className={`${styleProviderClassName} bg-j-cream text-j-text font-body antialiased`}
        suppressHydrationWarning
      >
        {children}
        <AnalyticsBootstrap consentBannerContent={consentBannerContent} />
        <DelegatedTracking />
      </body>
    </html>
  );
}
