import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { generateReadingStaticParams } from "@/data/readings";
import { findGiftRecipientThankYou } from "@/lib/booking/submissions";
import { fetchThankYouSessionSnapshot } from "@/lib/booking/thankYouSession";
import { type GiftThankYouResult, resolveGiftThankYou } from "@/lib/gift/giftThankYou";
import { resolveReadingSummary } from "@/lib/readingSummary";
import {
  fetchGiftSettings,
  fetchReading,
  fetchSiteSettings,
  fetchThankYouPage,
} from "@/lib/sanity/fetch";
import { isUuid } from "@/lib/uuid";

import { deriveGiftThankYouViewProps } from "./deriveGiftThankYouViewProps";
import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "./deriveThankYouViewProps";
import { GiftThankYouView } from "./GiftThankYouView";
import { loadRecipientThankYouViewProps } from "./loadRecipientThankYouViewProps";
import { ThankYouView } from "./ThankYouView";

export { generateReadingStaticParams as generateStaticParams };

type ThankYouSearchParams = {
  sessionId?: string | string[];
  submissionId?: string | string[];
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
  const reading = await resolveReadingSummary(segment, fetchReading);
  return reading && { name: reading.name, price: reading.priceLabel, cents: reading.priceCents };
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

async function renderRecipientThankYou(submissionId: string) {
  if (!isUuid(submissionId)) redirect("/");
  const viewProps = await loadRecipientThankYouViewProps(findGiftRecipientThankYou(submissionId));
  return <ThankYouView {...viewProps} />;
}

export default async function ThankYouPage({ params, searchParams }: ThankYouPageProps) {
  const [{ readingId }, { sessionId, submissionId }] = await Promise.all([params, searchParams]);
  if (sessionId === undefined && typeof submissionId === "string") {
    return renderRecipientThankYou(submissionId);
  }
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
