import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { fetchThankYouSessionSnapshot } from "@/lib/booking/thankYouSession";
import { type GiftThankYouResult, resolveGiftThankYou } from "@/lib/gift/giftThankYou";
import {
  fetchGiftSettings,
  fetchReading,
  fetchSiteSettings,
  fetchThankYouPage,
} from "@/lib/sanity/fetch";

import { deriveGiftThankYouViewProps } from "./deriveGiftThankYouViewProps";
import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "./deriveThankYouViewProps";
import { GiftThankYouView } from "./GiftThankYouView";
import { ThankYouView } from "./ThankYouView";

export { generateReadingStaticParams as generateStaticParams };

type ThankYouSearchParams = {
  sessionId?: string | string[];
};

type ThankYouPageProps = {
  params: Promise<{ readingId: string }>;
  searchParams: Promise<ThankYouSearchParams>;
};

const STRIPE_SESSION_PATTERN = /^cs_(test|live)_[A-Za-z0-9]+$/;

function isValidStripeSession(sessionId: string | string[] | undefined): sessionId is string {
  if (typeof sessionId !== "string") return false;
  return STRIPE_SESSION_PATTERN.test(sessionId);
}

export async function generateMetadata(): Promise<Metadata> {
  const thankYouPageContent = await fetchThankYouPage();
  return {
    title: thankYouPageContent?.seo?.metaTitle ?? "Thank You — Josephine",
    description:
      thankYouPageContent?.seo?.metaDescription ??
      "Your reading is in my hands. You'll receive a confirmation email shortly with your answers and timeline.",
    robots: { index: false, follow: false },
  };
}

async function resolveReading(
  segment: string,
): Promise<ResolvedThankYouContext["reading"] | null> {
  const sanityReading = await fetchReading(segment);
  if (sanityReading) {
    return {
      name: sanityReading.name,
      price: sanityReading.priceDisplay,
      cents: sanityReading.price,
    };
  }
  const fallback = getReadingById(segment);
  return fallback
    ? { name: fallback.name, price: fallback.price, cents: null }
    : null;
}

async function renderGiftThankYou(
  gift: GiftThankYouResult,
  routeSlug: string,
  routeReading: ResolvedThankYouContext["reading"] | null,
) {
  const [giftSettings, reading] = await Promise.all([
    fetchGiftSettings(),
    gift.readingSlug === routeSlug ? routeReading : resolveReading(gift.readingSlug),
  ]);
  if (!reading) notFound();
  const viewProps = deriveGiftThankYouViewProps({ gift, readingName: reading.name, giftSettings });
  return <GiftThankYouView {...viewProps} />;
}

export default async function ThankYouPage({ params, searchParams }: ThankYouPageProps) {
  const [{ readingId }, { sessionId }] = await Promise.all([params, searchParams]);
  if (!isValidStripeSession(sessionId)) redirect("/");

  const [snapshot, reading] = await Promise.all([
    fetchThankYouSessionSnapshot(sessionId),
    resolveReading(readingId),
  ]);
  const gift = await resolveGiftThankYou(sessionId, snapshot);
  if (gift) return renderGiftThankYou(gift, readingId, reading);
  if (snapshot.kind === "unavailable") throw new Error("Stripe session unavailable");
  if (!reading) notFound();

  const [thankYouPageContent, siteSettings] = await Promise.all([
    fetchThankYouPage(),
    fetchSiteSettings(),
  ]);

  const viewProps = deriveThankYouViewProps({
    context: { reading, paidAmount: snapshot.paidAmount },
    thankYouPageContent,
    siteSettings,
    slugForOverride: readingId,
  });

  return <ThankYouView {...viewProps} />;
}
