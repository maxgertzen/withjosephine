// Recipient claim landing. The original implementation set the gift-claim
// cookie inline here, which Next 15 rejects from a Server Component
// ("Cookies can only be modified in a Server Action or Route Handler").
// The verify + cookie-set + redirect now lives in `/api/gift/claim`; this
// page is responsible for two things only:
//   1. No-token entry (`/gift/claim`) → render the "where's my link?" copy
//   2. Invalid-token bounce-back (`/gift/claim?invalid=1`) → render the
//      "this gift has already been claimed or was cancelled" copy
//
// The successful path (`/gift/claim?token=<raw>`) is intercepted by a
// redirect to `/api/gift/claim?token=<raw>` so existing email links keep
// working unchanged.
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
  const copy = (await fetchGiftClaimPage()) ?? GIFT_CLAIM_PAGE_DEFAULTS;

  if (token) {
    redirect(`/api/gift/claim?token=${encodeURIComponent(token)}`);
  }

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
