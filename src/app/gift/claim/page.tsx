import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { GIFT_CLAIM_PAGE_DEFAULTS } from "@/data/defaults";
import { verifyGiftClaimToken } from "@/lib/booking/giftClaim";
import { setGiftClaimCookie } from "@/lib/booking/giftClaimSession";
import { PAGE_ORBS } from "@/lib/celestialPresets";
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

function VellumShell({
  heading,
  body,
}: {
  heading: string;
  body: string;
}) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
      <BookingFlowHeader backHref="/" />
      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10 md:px-12 md:py-14 text-center">
            <span aria-hidden="true" className="block text-j-accent text-xl mb-3">
              ✦
            </span>
            <h1 className="font-display italic font-medium text-[clamp(1.75rem,5vw,2.25rem)] leading-tight text-j-text-heading">
              {heading}
            </h1>
            <GoldDivider className="max-w-[8rem] mx-auto my-6" />
            <p className="font-body text-base text-j-text leading-relaxed whitespace-pre-line">
              {body}
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
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
