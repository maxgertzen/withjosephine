import "@/styles/globals.css";

import type { Viewport } from "next";
import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

import { CloudflareAnalytics } from "@/components/CloudflareAnalytics";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { isAnalyticsEnabled } from "@/lib/featureFlags";
import { bodyFont, displayFont } from "@/lib/fonts.generated";
import { SanityLive } from "@/lib/sanity/live";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();
  const analyticsToken = isAnalyticsEnabled() ? process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN! : null;

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body
        className="bg-j-cream text-j-text font-body antialiased"
        suppressHydrationWarning
      >
        {children}
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
        {analyticsToken && <CloudflareAnalytics token={analyticsToken} />}
      </body>
    </html>
  );
}
