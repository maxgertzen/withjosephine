// Recipient claim landing. The success path (`?token=<raw>`) redirects to
// the `/api/gift/claim` Route Handler — Next 15 disallows `cookies().set()`
// from Server Components, so this page can't sign the recipient in itself.
// Renders fallback copy for the no-token and ?invalid=1 cases.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VellumShell } from "@/components/VellumShell";
import { loadGiftClaimCopy } from "@/lib/sanity/fetch";

export const dynamic = "force-dynamic";

type GiftClaimPageProps = {
  searchParams: Promise<{ token?: string; invalid?: string; expired?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const copy = await loadGiftClaimCopy();
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

  const copy = await loadGiftClaimCopy();

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
