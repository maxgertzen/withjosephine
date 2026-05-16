import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { ThankYouGuard } from "@/components/ThankYouGuard";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { formatAmountPaid } from "@/lib/booking/formatAmount";
import { purchaserFirstNameOrNull } from "@/lib/booking/giftPersonas";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { CONTACT_EMAIL } from "@/lib/constants";
import { firstParamValue } from "@/lib/next/searchParams";
import { fetchReading, fetchSiteSettings, fetchThankYouPage } from "@/lib/sanity/fetch";
import { retrieveCheckoutSession } from "@/lib/stripe";

export { generateReadingStaticParams as generateStaticParams };

type ThankYouSearchParams = {
  sessionId?: string | string[];
  gift?: string | string[];
  purchaserFirstName?: string | string[];
  redeemed?: string | string[];
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

type PaidAmount = { display: string | null; cents: number | null };

const SLOT_SPLIT = /(\{[a-zA-Z]+\})/g;
const SLOT_MATCH = /^\{([a-zA-Z]+)\}$/;

function renderWithSlots(template: string, slots: Record<string, ReactNode>): ReactNode {
  return template.split(SLOT_SPLIT).map((part, index) => {
    const match = SLOT_MATCH.exec(part);
    if (match && slots[match[1]] !== undefined) {
      return <Fragment key={index}>{slots[match[1]]}</Fragment>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

async function fetchPaidAmount(sessionId: string): Promise<PaidAmount> {
  try {
    const session = await retrieveCheckoutSession(sessionId);
    const cents = session.amount_total ?? null;
    return {
      cents,
      display: formatAmountPaid(cents, session.currency ?? undefined),
    };
  } catch (error) {
    // Surface the rest of the page even if the Stripe API is briefly down —
    // the customer's payment already succeeded if they're here.
    console.warn(`[thank-you] Failed to retrieve session ${sessionId}`, error);
    return { cents: null, display: null };
  }
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

type ThankYouMode = "purchase" | "giftPurchaser" | "giftRecipient";

type ResolvedContext = {
  mode: ThankYouMode;
  reading: { name: string; price: string; cents: number | null };
  paidAmount: PaidAmount;
  submission: SubmissionRecord | null;
  purchaserFirstName: string | null;
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

  // Hot-path fast lane: a paid purchaser without the gift flag never reads
  // submission data — skip the D1 round-trip.
  if (sessionValid && !giftFlag) {
    const [paidAmount, reading] = await Promise.all([
      fetchPaidAmount(sessionId),
      resolveReading(segment, null),
    ]);
    if (!reading) return null;
    return { mode: "purchase", reading, paidAmount, submission: null, purchaserFirstName: null };
  }

  if (sessionValid) {
    const [paidAmount, submissionLookup] = await Promise.all([
      fetchPaidAmount(sessionId),
      findSubmissionById(segment),
    ]);
    const reading = await resolveReading(segment, submissionLookup);
    if (!reading) return null;
    const isSessionGift = giftFlag || (submissionLookup?.isGift ?? false);
    if (!isSessionGift) {
      return { mode: "purchase", reading, paidAmount, submission: submissionLookup, purchaserFirstName: null };
    }
    const purchaserFirstName =
      purchaserNameOverride ??
      (submissionLookup ? purchaserFirstNameOrNull(submissionLookup) : null);
    return {
      mode: "giftPurchaser",
      reading,
      paidAmount,
      submission: submissionLookup,
      purchaserFirstName,
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

  const { mode, reading, paidAmount, purchaserFirstName } = context;
  const slugForOverride = context.submission?.reading?.slug ?? readingId;

  const showsDiscountedPrice =
    paidAmount.cents !== null && reading.cents !== null && paidAmount.cents < reading.cents;

  const override = thankYouPageContent?.overrides?.find((o) => o.readingSlug === slugForOverride);

  const isPurchaser = mode === "giftPurchaser";
  const isRecipient = mode === "giftRecipient";

  const heading =
    isPurchaser
      ? (thankYouPageContent?.giftPurchaserHeading ?? "Thank you, {purchaserFirstName}. Your gift is on its way.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientHeading ?? "Thank you. Your reading is in my hands now.")
        : (override?.heading ?? thankYouPageContent?.heading ?? "Thank you. I\u2019ve got everything I need.");
  const subheading =
    isPurchaser
      ? (thankYouPageContent?.giftPurchaserSubheading ?? "I'll take it from here. The recipient will receive a note from me with their claim link.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientSubheading ?? "I've received everything I need to begin.")
        : (override?.subheading ?? thankYouPageContent?.subheading ?? "Your reading is in my hands now.");
  const readingLabel = thankYouPageContent?.readingLabel ?? "Your Reading";
  const confirmationBody =
    isPurchaser
      ? (thankYouPageContent?.giftPurchaserBody ??
        "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link \u2014 they'll share their intake details with me from there.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientBody ??
          "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.")
        : (override?.confirmationBody ??
          thankYouPageContent?.confirmationBody ??
          "A confirmation email is on its way to your inbox in the next minute or two \u2014 it includes a copy of the answers you shared so you have them on hand. If you can\u2019t find it, please check your promotions folder.");
  const timelineBody =
    override?.timelineBody ??
    thankYouPageContent?.timelineBody ??
    "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.";
  const deliveryDaysPhrase = thankYouPageContent?.deliveryDaysPhrase ?? "seven days";
  const contactBody =
    override?.contactBody ??
    thankYouPageContent?.contactBody ??
    "If anything comes up \u2014 a question, a detail you forgot to mention, or anything that doesn\u2019t look right in your confirmation \u2014 just reply to that email or write to me at {email}. It comes straight to me.";
  const closingMessage =
    override?.closingMessage ??
    thankYouPageContent?.closingMessage ??
    "With love, Josephine \u2726";
  const returnButtonText = thankYouPageContent?.returnButtonText ?? "Return to Home";
  const contactEmail = siteSettings?.contactEmail || CONTACT_EMAIL;
  const purchaserSlotValue = purchaserFirstName ?? "";

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <ThankYouGuard />
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10">
          <Mail className="w-9 h-9 text-j-accent" strokeWidth={1.5} />
        </div>

        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {renderWithSlots(heading, { purchaserFirstName: purchaserSlotValue })}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {subheading}
        </p>

        <div className="mt-10 bg-j-ivory border border-j-border-subtle rounded-[20px] p-6 shadow-j-soft inline-flex items-center gap-6">
          <div className="text-left">
            <span className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted">
              {readingLabel}
            </span>
            <p className="font-display text-xl italic text-j-text-heading mt-1">{reading.name}</p>
          </div>
          {showsDiscountedPrice ? (
            <span className="font-display text-2xl italic flex items-baseline gap-2">
              <span className="line-through text-j-text-muted text-lg">{reading.price}</span>
              <span className="text-j-accent">{paidAmount.display}</span>
            </span>
          ) : (
            <span className="font-display text-2xl italic text-j-accent">
              {paidAmount.display ?? reading.price}
            </span>
          )}
        </div>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <div className="text-left max-w-prose mx-auto flex flex-col gap-5 font-body text-base text-j-text leading-relaxed">
          <p className="whitespace-pre-line">
            {renderWithSlots(confirmationBody, { purchaserFirstName: purchaserSlotValue })}
          </p>
          <p className="whitespace-pre-line">
            {renderWithSlots(timelineBody, {
              deliveryDays: (
                <span className="font-display italic text-j-accent">{deliveryDaysPhrase}</span>
              ),
            })}
          </p>
          <p className="whitespace-pre-line">
            {renderWithSlots(contactBody, {
              email: (
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-display italic text-j-text-heading border-b border-j-border-gold hover:border-j-accent transition-colors"
                >
                  {contactEmail}
                </a>
              ),
            })}
          </p>
        </div>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <p className="font-display italic text-base text-j-text max-w-sm mx-auto whitespace-pre-line">
          {closingMessage}
        </p>

        <div className="mt-10">
          <Button href="/" variant="ghost" size="lg">
            {returnButtonText}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
