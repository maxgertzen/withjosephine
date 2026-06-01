import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { purchaserFirstNameOrNull, recipientNameFor } from "@/lib/booking/giftPersonas";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";
import {
  fetchThankYouSessionSnapshot,
  type ThankYouPaidAmount,
} from "@/lib/booking/thankYouSession";
import { CONTACT_EMAIL } from "@/lib/constants";
import { firstParamValue } from "@/lib/next/searchParams";
import { fetchReading, fetchSiteSettings, fetchThankYouPage } from "@/lib/sanity/fetch";
import type { SanitySiteSettings, SanityThankYouPage } from "@/lib/sanity/types";

import { type ThankYouMode, ThankYouView, type ThankYouViewProps } from "./ThankYouView";

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

type PaidAmount = ThankYouPaidAmount;

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

type ResolvedContext = {
  mode: ThankYouMode;
  reading: { name: string; price: string; cents: number | null };
  paidAmount: PaidAmount;
  submission: SubmissionRecord | null;
  purchaserFirstName: string | null;
  recipientName: string | null;
};

async function resolveContext(
  segment: string,
  search: ThankYouSearchParams,
): Promise<ResolvedContext | null> {
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
): Promise<ResolvedContext["reading"] | null> {
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

function deriveThankYouViewProps(args: {
  context: ResolvedContext;
  thankYouPageContent: SanityThankYouPage | null;
  siteSettings: SanitySiteSettings | null;
  slugForOverride: string;
}): ThankYouViewProps {
  const { context, thankYouPageContent, siteSettings, slugForOverride } = args;
  const { mode, reading, paidAmount, purchaserFirstName, recipientName, submission } = context;
  const isPurchaser = mode === "giftPurchaser";
  const isRecipient = mode === "giftRecipient";
  const isSelfSendPurchaser =
    isPurchaser && submission?.giftDeliveryMethod === GIFT_DELIVERY.selfSend;
  const override = thankYouPageContent?.overrides?.find((o) => o.readingSlug === slugForOverride);

  const heading = isPurchaser
    ? (thankYouPageContent?.giftPurchaserHeading ?? "Thank you, {purchaserFirstName}. Your gift is on its way.")
    : isRecipient
      ? (thankYouPageContent?.giftRecipientHeading ?? "Thank you, {recipientName}. Your reading is in my hands now.")
      : (override?.heading ?? thankYouPageContent?.heading ?? "Thank you. I\u2019ve got everything I need.");

  const subheading = isSelfSendPurchaser
    ? (thankYouPageContent?.giftPurchaserSelfSendSubheading ??
      "Your gift link is ready in the email I just sent \u2014 share it with them whenever feels right.")
    : isPurchaser
      ? (thankYouPageContent?.giftPurchaserSubheading ?? "I'll take it from here. The recipient will receive a note from me with their claim link.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientSubheading ?? "I've received everything I need to begin.")
        : (override?.subheading ?? thankYouPageContent?.subheading ?? "Your reading is in my hands now.");

  const readingLabel = isPurchaser
    ? (thankYouPageContent?.giftPurchaserReadingLabel ?? "Your gift")
    : (thankYouPageContent?.readingLabel ?? "Your Reading");

  const confirmationBody = isSelfSendPurchaser
    ? (thankYouPageContent?.giftPurchaserSelfSendBody ??
      "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready \u2014 they'll claim from there.")
    : isPurchaser
      ? (thankYouPageContent?.giftPurchaserBody ??
        "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link \u2014 they'll share their intake details with me from there.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientBody ??
          "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.")
        : (override?.confirmationBody ??
          thankYouPageContent?.confirmationBody ??
          "A confirmation email is on its way to your inbox in the next minute or two. If you can\u2019t find it, please check your promotions folder.");

  const timelineBody = isPurchaser
    ? (thankYouPageContent?.giftPurchaserTimelineBody ??
      "I\u2019ll begin the recipient\u2019s reading within the next two days of them claiming the gift, and I\u2019ll send them a short note when I do. Their voice note and PDF will arrive within {deliveryDays}, sent to the email they use to claim.")
    : isRecipient
      ? (thankYouPageContent?.giftRecipientBody ??
        "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.")
      : (override?.timelineBody ??
        thankYouPageContent?.timelineBody ??
        "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.");

  const contactBody = isPurchaser
    ? (thankYouPageContent?.giftPurchaserContactBody ??
      "If anything comes up with the gift \u2014 a wrong recipient email, a change of plan, anything that doesn\u2019t look right in your confirmation \u2014 just reply to that email or write to me at {email}. It comes straight to me.")
    : isRecipient
      ? (thankYouPageContent?.giftRecipientContactBody ??
        "If anything comes up \u2014 a question, a detail you forgot to mention, or anything that doesn\u2019t look right in your confirmation \u2014 just reply to that email or write to me at {email}. It comes straight to me.")
      : (override?.contactBody ??
        thankYouPageContent?.contactBody ??
        "If anything comes up \u2014 a question, a detail you forgot to mention, or anything that doesn\u2019t look right in your confirmation \u2014 just reply to that email or write to me at {email}. It comes straight to me.");

  return {
    mode,
    reading,
    paidAmount,
    purchaserFirstName,
    recipientName,
    contactEmail: siteSettings?.contactEmail || CONTACT_EMAIL,
    copy: {
      heading,
      subheading,
      readingLabel,
      confirmationBody,
      timelineBody,
      contactBody,
      closingMessage:
        override?.closingMessage ?? thankYouPageContent?.closingMessage ?? "With love, Josephine \u2726",
      returnButtonText: thankYouPageContent?.returnButtonText ?? "Return to Home",
      deliveryDaysPhrase: thankYouPageContent?.deliveryDaysPhrase ?? "seven days",
    },
  };
}
