import "@/styles/globals.css";

import type { Viewport } from "next";
import { draftMode, headers } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

import { AnalyticsBootstrap } from "@/components/AnalyticsBootstrap";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { bodyFont, displayFont } from "@/lib/fonts.generated";
import { CONSENT_HEADER } from "@/lib/region";
import { fetchSiteSettings } from "@/lib/sanity/fetch";
import { SanityLive } from "@/lib/sanity/live";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();
  const requestHeaders = await headers();
  const consentRequired = requestHeaders.get(CONSENT_HEADER) === "1";
  const consentBannerContent =
    consentRequired || isDraftMode
      ? (await fetchSiteSettings())?.consentBanner ?? null
      : null;

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body
        className="bg-j-cream text-j-text font-body antialiased"
        suppressHydrationWarning
      >
        {children}
        <AnalyticsBootstrap
          consentRequired={consentRequired}
          consentBannerContent={consentBannerContent}
          previewMode={isDraftMode}
        />
        {isDraftMode && (
          <>
            {/*
              Gated to draft mode only per Sanity's documented production
              guidance (sanity.io/docs/help/nextjs-16-sanitylive-status).
              Outside Studio Presentation we don't need browser-side live
              updates — server tag-revalidation already covers freshness —
              and rendering it on every public request triggers Sanity Live
              connection attempts that the public CSP rightly blocks.
            */}
            <SanityLive />
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  );
}
