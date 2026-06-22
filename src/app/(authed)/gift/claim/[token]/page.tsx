import type { Metadata } from "next";

import { VellumShell } from "@/components/VellumShell";
import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";
import { verifyGiftClaimToken } from "@/lib/booking/giftClaim";
import { recipientNameFor } from "@/lib/booking/giftPersonas";
import { renderWithSlots } from "@/lib/copy/templateSlots";
import { fetchGiftClaimPage } from "@/lib/sanity/fetch";

type GiftClaimGreetingProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

export default async function GiftClaimGreetingPage({ params }: GiftClaimGreetingProps) {
  const { token } = await params;
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;

  const submission = await verifyGiftClaimToken(token);
  const recipientName = submission ? recipientNameFor(submission) : null;

  if (!recipientName) {
    return (
      <VellumShell heading={copy.alreadyClaimedHeading} body={copy.alreadyClaimedBody} />
    );
  }

  const slots = { recipientName };
  return (
    <VellumShell
      heading={renderWithSlots(copy.welcomeHeading, slots)}
      body={renderWithSlots(copy.welcomeBody, slots)}
      ctaHref={`/gift/claim?token=${encodeURIComponent(token)}`}
      ctaLabel={copy.welcomeCtaLabel}
    />
  );
}
