import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

import { DisableDraftMode } from "@/components/DisableDraftMode";
import { SanityLive } from "@/lib/sanity/live";

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled: isDraftMode } = await draftMode();

  return (
    <>
      {children}
      {isDraftMode && (
        <>
          {/*
            Live tree lives here, not the root layout, so only /preview is
            dynamic. action="refresh" forces router.refresh on edits (v13
            removed the default focus refresh). Gated to draft per Sanity's
            production guidance; the public CSP blocks Sanity Live anyway.
          */}
          <SanityLive action="refresh" />
          <VisualEditing />
          <DisableDraftMode />
        </>
      )}
    </>
  );
}
