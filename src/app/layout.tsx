import "@/styles/globals.css";

import type { Metadata, Viewport } from "next";

import { AnalyticsBootstrap } from "@/components/AnalyticsBootstrap";
import { DelegatedTracking } from "@/components/DelegatedTracking";
import { styleProviderClassName } from "@/components/StyleProvider";
import { siteOrigin } from "@/lib/env";
import { fetchSiteSettingsPublished } from "@/lib/sanity/fetch";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seoMetadata";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-j-deep focus:px-5 focus:py-2 focus:font-body focus:text-sm focus:text-j-cream focus:shadow-j-soft"
        >
          Skip to content
        </a>
        {children}
        <AnalyticsBootstrap consentBannerContent={consentBannerContent} />
        <DelegatedTracking />
      </body>
    </html>
  );
}
