import { draftMode } from "next/headers";

import { DisableDraftMode } from "@/components/DisableDraftMode";
import { footerNewsletterSlot } from "@/components/Footer/footerNewsletterSlot";
import { NewsletterSlotProvider } from "@/components/Footer/NewsletterContext";
import { fetchSiteSettings } from "@/lib/sanity/fetch";
import { SanityLive } from "@/lib/sanity/live";

import { PreviewLinkRouter } from "./PreviewLinkRouter";
import { PreviewVisualEditing } from "./PreviewVisualEditing";

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();
  const draftSettings = isDraftMode ? await fetchSiteSettings().catch(() => null) : null;

  return (
    <>
      {draftSettings ? (
        <NewsletterSlotProvider slot={footerNewsletterSlot(draftSettings.newsletter)}>{children}</NewsletterSlotProvider>
      ) : (
        children
      )}
      {isDraftMode && (
        <>
          {/*
            Live tree lives here, not the root layout, so only /preview is
            dynamic. Gated to draft per Sanity's production guidance; the
            public CSP blocks Sanity Live anyway.
          */}
          <SanityLive action="refresh" />
          <PreviewVisualEditing />
          <DisableDraftMode />
          <PreviewLinkRouter />
        </>
      )}
    </>
  );
}
