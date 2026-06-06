import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { purchaserFirstNameOrNull, recipientNameFor } from "@/lib/booking/giftPersonas";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";
import { fetchThankYouSessionSnapshot } from "@/lib/booking/thankYouSession";
import { firstParamValue } from "@/lib/next/searchParams";
import { fetchReading, fetchSiteSettings, fetchThankYouPage } from "@/lib/sanity/fetch";

import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "./deriveThankYouViewProps";
import { type ThankYouMode, ThankYouView } from "./ThankYouView";

export { generateReadingStaticParams as generateStaticParams };

type ThankYouSearchParams = {
  sessionId?: string | string[];
  gift?: string | string[];
  purchaserFirstName?: string | string[];
  redeemed?: string | string[];
  submission?: string | string[];
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

// Mock-mode Stripe responses don't carry `client_reference_id`, so the page
// can't recover the submission ID via the Stripe API path. Under E2E=1 only
// (gated so prod can't be tricked into reading PII via URL tampering), accept
// the submission ID from a sibling URL param.
function e2eSubmissionFallback(search: ThankYouSearchParams): string | null {
  if (process.env.E2E !== "1") return null;
  const value = firstParamValue(search.submission)?.trim();
  return value ? value : null;
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
  const giftFlag = firstParamValue(search.gift) === "1";
  const redeemedFlag = firstParamValue(search.redeemed) === "1";
  const purchaserNameOverride = firstParamValue(search.purchaserFirstName)?.trim() || null;
  const sessionValid = isValidStripeSession(sessionId);

  if (sessionValid) {
    const snapshot = await fetchThankYouSessionSnapshot(sessionId);
    // Stripe Payment Links don't reliably persist URL-supplied `metadata` onto
    // the resulting Checkout Session, so derive gift-mode from the submission
    // record (D1 source-of-truth) rather than `session.metadata.is_gift`.
    const submissionLookup = await findSubmissionById(
      snapshot.submissionIdFromSession ?? e2eSubmissionFallback(search) ?? segment,
    );
    const isSessionGift =
      giftFlag || snapshot.isGift || submissionLookup?.isGift === true;
    const reading = await resolveReading(segment, submissionLookup);
    if (!reading) return null;
    if (!isSessionGift) {
      return {
        mode: "purchase",
        reading,
        paidAmount: snapshot.paidAmount,
        submission: null,
        purchaserFirstName: null,
        recipientName: null,
      };
    }
    const purchaserFirstName =
      purchaserNameOverride ??
      (submissionLookup ? purchaserFirstNameOrNull(submissionLookup) : null);
    return {
      mode: "giftPurchaser",
      reading,
      paidAmount: snapshot.paidAmount,
      submission: submissionLookup,
      purchaserFirstName,
      recipientName: submissionLookup ? recipientNameFor(submissionLookup) : null,
    };
  }

  if (giftFlag) {
    const submissionLookup = await findSubmissionById(segment);
    const reading = await resolveReading(segment, submissionLookup);
    if (!reading) return null;
    if (redeemedFlag) {
      return {
        mode: "giftRecipient",
        reading,
        paidAmount: { cents: null, display: null },
        submission: submissionLookup,
        purchaserFirstName: null,
        recipientName: submissionLookup ? recipientNameFor(submissionLookup) : null,
      };
    }
    const purchaserFirstName =
      purchaserNameOverride ??
      (submissionLookup ? purchaserFirstNameOrNull(submissionLookup) : null);
    const mode: ThankYouMode = purchaserFirstName ? "giftPurchaser" : "giftRecipient";
    return {
      mode,
      reading,
      paidAmount: { cents: null, display: null },
      submission: submissionLookup,
      purchaserFirstName: mode === "giftPurchaser" ? purchaserFirstName : null,
      recipientName: submissionLookup ? recipientNameFor(submissionLookup) : null,
    };
  }

  return null;
}

async function resolveReading(
  segment: string,
  submission: SubmissionRecord | null,
): Promise<ResolvedThankYouContext["reading"] | null> {
  const submissionReading = submission?.reading ?? null;
  const slugForLookup = submissionReading?.slug ?? segment;
  const sanityReading = await fetchReading(slugForLookup);
  if (sanityReading) {
    return {
      name: sanityReading.name,
      price: sanityReading.priceDisplay,
      cents: sanityReading.price,
    };
  }
  if (submissionReading) {
    return {
      name: submissionReading.name,
      price: submissionReading.priceDisplay,
      cents: null,
    };
  }
  const fallback = getReadingById(slugForLookup);
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
    slugForOverride: context.submission?.reading?.slug ?? readingId,
  });

  return <ThankYouView {...viewProps} />;
}
