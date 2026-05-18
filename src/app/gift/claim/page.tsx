// Recipient claim landing. The success path (`?token=<raw>`) redirects to
// the `/api/gift/claim` Route Handler — Next 15 disallows `cookies().set()`
// from Server Components, so this page can't sign the recipient in itself.
// Renders fallback copy for the no-token and ?invalid=1 cases.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VellumShell } from "@/components/VellumShell";
import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchGiftClaimPage } from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

type GiftClaimPageProps = {
  searchParams: Promise<{ token?: string; invalid?: string; expired?: string }>;
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
  const { token, invalid, expired } = await searchParams;

  if (token) {
    redirect(`/api/gift/claim?token=${encodeURIComponent(token)}`);
  }

  // Spread-merge with defaults so a Sanity doc that pre-dates a new field
  // (e.g. sessionExpiredHeading added 2026-05-18) still renders correctly
  // without a migration — the code defaults fill in any missing keys.
  const sanityCopy = await fetchGiftClaimPage();
  const copy = { ...GIFT_CLAIM_PAGE_DEFAULTS, ...(sanityCopy ?? {}) };

  if (invalid === "1") {
    return (
      <VellumShell
        heading={copy.alreadyClaimedHeading}
        body={copy.alreadyClaimedBody}
      />
    );
  }

  if (expired === "1") {
    return (
      <VellumShell
        heading={copy.sessionExpiredHeading}
        body={copy.sessionExpiredBody}
      />
    );
  }

  return <VellumShell heading={copy.noTokenHeading} body={copy.noTokenBody} />;
}
