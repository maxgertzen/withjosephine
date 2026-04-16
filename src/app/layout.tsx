import "@/styles/globals.css";

import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

import { CloudflareAnalytics } from "@/components/CloudflareAnalytics";
import { DisableDraftMode } from "@/components/DisableDraftMode";
import { isAnalyticsEnabled } from "@/lib/featureFlags";
import { bodyFont, displayFont } from "@/lib/fonts.generated";
import { SanityLive } from "@/lib/sanity/live";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();
  const analyticsToken = isAnalyticsEnabled() ? process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN! : null;

  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="bg-j-cream text-j-text font-body antialiased">
        {children}
        {/*
          Always-on. Subscribes the server to Sanity's content-change stream
          and revalidates affected page caches — required for live preview to
          update without a manual refresh.
        */}
        <SanityLive />
        {isDraftMode && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
        {analyticsToken && <CloudflareAnalytics token={analyticsToken} />}
      </body>
    </html>
  );
}
