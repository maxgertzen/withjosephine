import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { fetchThankYouSessionSnapshot } from "@/lib/booking/thankYouSession";
import { fetchReading, fetchSiteSettings, fetchThankYouPage } from "@/lib/sanity/fetch";

import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "./deriveThankYouViewProps";
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

async function resolveContext(
  segment: string,
  search: ThankYouSearchParams,
): Promise<ResolvedThankYouContext | null> {
  const sessionId = typeof search.sessionId === "string" ? search.sessionId : undefined;
  if (!isValidStripeSession(sessionId)) return null;

  const snapshot = await fetchThankYouSessionSnapshot(sessionId);
  const reading = await resolveReading(segment);
  if (!reading) return null;
  return {
    reading,
    paidAmount: snapshot.paidAmount,
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

export default async function ThankYouPage({ params, searchParams }: ThankYouPageProps) {
  const [{ readingId }, search] = await Promise.all([params, searchParams]);

  const context = await resolveContext(readingId, search);
  if (!context) {
    const sessionIdParam = typeof search.sessionId === "string" ? search.sessionId : undefined;
    if (!isValidStripeSession(sessionIdParam)) {
      redirect("/");
    }
    notFound();
  }

  const [thankYouPageContent, siteSettings] = await Promise.all([
    fetchThankYouPage(),
    fetchSiteSettings(),
  ]);

  const viewProps = deriveThankYouViewProps({
    context,
    thankYouPageContent,
    siteSettings,
    slugForOverride: readingId,
  });

  return <ThankYouView {...viewProps} />;
}
