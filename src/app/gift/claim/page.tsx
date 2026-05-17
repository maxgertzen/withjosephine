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
  searchParams: Promise<{ token?: string; invalid?: string }>;
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
  const { token, invalid } = await searchParams;

  if (token) {
    redirect(`/api/gift/claim?token=${encodeURIComponent(token)}`);
  }

  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;

  if (invalid === "1") {
    return (
      <VellumShell
        heading={copy.alreadyClaimedHeading}
        body={copy.alreadyClaimedBody}
      />
    );
  }

  return <VellumShell heading={copy.noTokenHeading} body={copy.noTokenBody} />;
}
