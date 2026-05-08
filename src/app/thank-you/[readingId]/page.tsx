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
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { CONTACT_EMAIL } from "@/lib/constants";
import { fetchReading, fetchSiteSettings, fetchThankYouPage } from "@/lib/sanity/fetch";
import { retrieveCheckoutSession } from "@/lib/stripe";

export { generateReadingStaticParams as generateStaticParams };

type ThankYouPageProps = {
  params: Promise<{ readingId: string }>;
  searchParams: Promise<{ sessionId?: string | string[] }>;
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

export default async function ThankYouPage({ params, searchParams }: ThankYouPageProps) {
  const [{ readingId }, { sessionId }] = await Promise.all([params, searchParams]);

  if (!isValidStripeSession(sessionId)) {
    redirect("/");
  }

  const [sanityReading, thankYouPageContent, siteSettings, paidAmount] = await Promise.all([
    fetchReading(readingId),
    fetchThankYouPage(),
    fetchSiteSettings(),
    fetchPaidAmount(sessionId),
  ]);

  const reading = sanityReading
    ? { name: sanityReading.name, price: sanityReading.priceDisplay, cents: sanityReading.price }
    : (() => {
        const fallback = getReadingById(readingId);
        return fallback
          ? { name: fallback.name, price: fallback.price, cents: null }
          : null;
      })();

  if (!reading) {
    notFound();
  }

  const showsDiscountedPrice =
    paidAmount.cents !== null && reading.cents !== null && paidAmount.cents < reading.cents;

  const heading = thankYouPageContent?.heading ?? "Thank you. I\u2019ve got everything I need.";
  const subheading =
    thankYouPageContent?.subheading ??
    "Your reading is in my hands now.";
  const readingLabel = thankYouPageContent?.readingLabel ?? "Your Reading";
  const confirmationBody =
    thankYouPageContent?.confirmationBody ??
    "A confirmation email is on its way to your inbox in the next minute or two \u2014 it includes a copy of the answers you shared so you have them on hand. If you can\u2019t find it, please check your promotions folder.";
  const timelineBody =
    thankYouPageContent?.timelineBody ??
    "I\u2019ll begin your reading within the next two days, and I\u2019ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.";
  const deliveryDaysPhrase = thankYouPageContent?.deliveryDaysPhrase ?? "seven days";
  const contactBody =
    thankYouPageContent?.contactBody ??
    "If anything comes up \u2014 a question, a detail you forgot to mention, or anything that doesn\u2019t look right in your confirmation \u2014 just reply to that email or write to me at {email}. It comes straight to me.";
  const closingMessage =
    thankYouPageContent?.closingMessage ??
    "With love, Josephine \u2726";
  const returnButtonText = thankYouPageContent?.returnButtonText ?? "Return to Home";
  const contactEmail = siteSettings?.contactEmail || CONTACT_EMAIL;

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
          {heading}
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
          <p className="whitespace-pre-line">{confirmationBody}</p>
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
