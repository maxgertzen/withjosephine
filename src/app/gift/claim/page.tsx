import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VellumShell } from "@/components/VellumShell";
import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";
import { verifyGiftClaimToken } from "@/lib/booking/giftClaim";
import { setGiftClaimCookie } from "@/lib/booking/giftClaimSession";
import { fetchGiftClaimPage } from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

type GiftClaimPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

export default async function GiftClaimPage({ searchParams }: GiftClaimPageProps) {
  const { token } = await searchParams;
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;

  if (!token) {
    return <VellumShell heading={copy.noTokenHeading} body={copy.noTokenBody} />;
  }

  const submission = await verifyGiftClaimToken(token);
  if (!submission) {
    return (
      <VellumShell
        heading={copy.alreadyClaimedHeading}
        body={copy.alreadyClaimedBody}
      />
    );
  }

  await setGiftClaimCookie(submission._id);
  redirect(`/gift/intake?welcome=1`);
}
