import type { Metadata } from "next";

import { VellumShell } from "@/components/VellumShell";
import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";
import { verifyGiftClaimToken } from "@/lib/booking/giftClaim";
import { recipientNameFor } from "@/lib/booking/giftPersonas";
import { firstParamValue } from "@/lib/next/searchParams";
import { fetchGiftClaimPage } from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

type GiftClaimGreetingProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ recipient?: string | string[] }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

export default async function GiftClaimGreetingPage({
  params,
  searchParams,
}: GiftClaimGreetingProps) {
  const [{ token }, search] = await Promise.all([params, searchParams]);
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;

  const recipientOverride = firstParamValue(search.recipient)?.trim() || null;
  const submission = recipientOverride ? null : await verifyGiftClaimToken(token);
  const recipientName = recipientOverride ?? (submission ? recipientNameFor(submission) : null);

  if (!recipientName) {
    return (
      <VellumShell heading={copy.alreadyClaimedHeading} body={copy.alreadyClaimedBody} />
    );
  }

  return (
    <VellumShell
      heading={`Welcome, ${recipientName}.`}
      body="Your reading is waiting. Tap the button below to share a few details so it can begin."
      ctaHref={`/gift/claim?token=${encodeURIComponent(token)}`}
      ctaLabel="Continue"
    />
  );
}
