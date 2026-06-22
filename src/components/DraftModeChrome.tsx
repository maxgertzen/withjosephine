import { draftMode } from "next/headers";
import { VisualEditing } from "next-sanity/visual-editing";

import { DisableDraftMode } from "@/components/DisableDraftMode";
import { SanityLive } from "@/lib/sanity/live";

// Draft-only: rendering SanityLive publicly trips the CSP + Live overages.
export async function DraftModeChrome() {
  const { isEnabled: isDraftMode } = await draftMode();
  if (!isDraftMode) return null;

  return (
    <>
      <SanityLive action="refresh" />
      <VisualEditing />
      <DisableDraftMode />
    </>
  );
}
