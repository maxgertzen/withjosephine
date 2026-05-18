import type { Metadata } from "next";

import { VellumShell } from "@/components/VellumShell";
import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchGiftClaimPage } from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

export default async function GiftAlreadySubmittedPage() {
  const sanityCopy = await fetchGiftClaimPage();
  const copy = { ...GIFT_CLAIM_PAGE_DEFAULTS, ...(sanityCopy ?? {}) };
  return (
    <VellumShell
      heading={copy.alreadySubmittedHeading}
      body={copy.alreadySubmittedBody}
    />
  );
}
