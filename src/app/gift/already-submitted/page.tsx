import type { Metadata } from "next";

import { VellumShell } from "@/components/VellumShell";
import { loadGiftClaimCopy } from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await loadGiftClaimCopy();
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

export default async function GiftAlreadySubmittedPage() {
  const copy = await loadGiftClaimCopy();
  return (
    <VellumShell
      heading={copy.alreadySubmittedHeading}
      body={copy.alreadySubmittedBody}
    />
  );
}
