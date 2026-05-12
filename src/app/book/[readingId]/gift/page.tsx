import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import { GiftForm } from "@/components/GiftForm";
import {
  BOOKING_GIFT_FORM_DEFAULTS,
  type BookingGiftFormContent,
  ENTRY_PAGE_DEFAULTS,
} from "@/data/defaults";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { BOOKING_ROUTES } from "@/lib/booking/constants";
import {
  fetchBookingForm,
  fetchBookingGiftForm,
  fetchReading,
} from "@/lib/sanity/fetch";
import type { SanityBookingGiftForm } from "@/lib/sanity/types";

export { generateReadingStaticParams as generateStaticParams };

type GiftPageProps = {
  params: Promise<{ readingId: string }>;
};

export async function generateMetadata({ params }: GiftPageProps): Promise<Metadata> {
  const { readingId } = await params;
  const reading = (await fetchReading(readingId)) ?? getReadingById(readingId);
  const title = reading
    ? `Gift a ${reading.name} — Josephine`
    : "Gift a Reading — Josephine";
  return {
    title,
    description: "Send a reading as a gift. They fill in their own details when they claim it.",
    robots: { index: false, follow: false },
  };
}

function mergeCopy(
  sanity: SanityBookingGiftForm | null,
): BookingGiftFormContent {
  const defaults = BOOKING_GIFT_FORM_DEFAULTS;
  if (!sanity) return defaults;
  return {
    heading: sanity.heading ?? defaults.heading,
    subheading: sanity.subheading ?? defaults.subheading,
    deliveryMethodLabel: sanity.deliveryMethodLabel ?? defaults.deliveryMethodLabel,
    deliveryMethodSelfSendLabel:
      sanity.deliveryMethodSelfSendLabel ?? defaults.deliveryMethodSelfSendLabel,
    deliveryMethodSelfSendHelper:
      sanity.deliveryMethodSelfSendHelper ?? defaults.deliveryMethodSelfSendHelper,
    deliveryMethodScheduledLabel:
      sanity.deliveryMethodScheduledLabel ?? defaults.deliveryMethodScheduledLabel,
    deliveryMethodScheduledHelper:
      sanity.deliveryMethodScheduledHelper ?? defaults.deliveryMethodScheduledHelper,
    purchaserFirstNameLabel:
      sanity.purchaserFirstNameLabel ?? defaults.purchaserFirstNameLabel,
    purchaserFirstNameHelper:
      sanity.purchaserFirstNameHelper ?? defaults.purchaserFirstNameHelper,
    purchaserEmailLabel: sanity.purchaserEmailLabel ?? defaults.purchaserEmailLabel,
    purchaserEmailHelper: sanity.purchaserEmailHelper ?? defaults.purchaserEmailHelper,
    recipientNameLabelSelfSend:
      sanity.recipientNameLabelSelfSend ?? defaults.recipientNameLabelSelfSend,
    recipientNamePlaceholderSelfSend:
      sanity.recipientNamePlaceholderSelfSend ?? defaults.recipientNamePlaceholderSelfSend,
    recipientNameLabelScheduled:
      sanity.recipientNameLabelScheduled ?? defaults.recipientNameLabelScheduled,
    recipientNameHelperScheduled:
      sanity.recipientNameHelperScheduled ?? defaults.recipientNameHelperScheduled,
    recipientEmailLabel: sanity.recipientEmailLabel ?? defaults.recipientEmailLabel,
    recipientEmailHelper: sanity.recipientEmailHelper ?? defaults.recipientEmailHelper,
    giftMessageLabel: sanity.giftMessageLabel ?? defaults.giftMessageLabel,
    giftMessagePlaceholder: sanity.giftMessagePlaceholder ?? defaults.giftMessagePlaceholder,
    sendAtSectionLabel: sanity.sendAtSectionLabel ?? defaults.sendAtSectionLabel,
    sendAtPresetNow: sanity.sendAtPresetNow ?? defaults.sendAtPresetNow,
    sendAtPresetWeek: sanity.sendAtPresetWeek ?? defaults.sendAtPresetWeek,
    sendAtPresetMonth: sanity.sendAtPresetMonth ?? defaults.sendAtPresetMonth,
    sendAtCustomLabel: sanity.sendAtCustomLabel ?? defaults.sendAtCustomLabel,
    consentIntro: sanity.consentIntro ?? defaults.consentIntro,
    nonRefundableNotice: sanity.nonRefundableNotice ?? defaults.nonRefundableNotice,
    art6ConsentLabel: sanity.art6ConsentLabel ?? defaults.art6ConsentLabel,
    coolingOffConsentLabel: sanity.coolingOffConsentLabel ?? defaults.coolingOffConsentLabel,
    termsConsentLabel: sanity.termsConsentLabel ?? defaults.termsConsentLabel,
    submitButtonSelfSend: sanity.submitButtonSelfSend ?? defaults.submitButtonSelfSend,
    submitButtonScheduled: sanity.submitButtonScheduled ?? defaults.submitButtonScheduled,
    loadingStateCopy: sanity.loadingStateCopy ?? defaults.loadingStateCopy,
    antiAbuseCapHeading: sanity.antiAbuseCapHeading ?? defaults.antiAbuseCapHeading,
    antiAbuseCapBody: sanity.antiAbuseCapBody ?? defaults.antiAbuseCapBody,
    firstNameRequiredError:
      sanity.firstNameRequiredError ?? defaults.firstNameRequiredError,
    emailInvalidError: sanity.emailInvalidError ?? defaults.emailInvalidError,
    recipientNameRequiredError:
      sanity.recipientNameRequiredError ?? defaults.recipientNameRequiredError,
    recipientEmailRequiredError:
      sanity.recipientEmailRequiredError ?? defaults.recipientEmailRequiredError,
    sendAtRequiredError: sanity.sendAtRequiredError ?? defaults.sendAtRequiredError,
    consentRequiredError: sanity.consentRequiredError ?? defaults.consentRequiredError,
    verificationError: sanity.verificationError ?? defaults.verificationError,
    genericError: sanity.genericError ?? defaults.genericError,
    networkError: sanity.networkError ?? defaults.networkError,
    sendAtTimezoneHint: sanity.sendAtTimezoneHint ?? defaults.sendAtTimezoneHint,
  };
}

export default async function GiftPage({ params }: GiftPageProps) {
  const { readingId } = await params;

  const [sanityReading, bookingForm, giftFormCopy] = await Promise.all([
    fetchReading(readingId),
    fetchBookingForm(),
    fetchBookingGiftForm(),
  ]);

  const reading = sanityReading
    ? {
        slug: sanityReading.slug,
        name: sanityReading.name,
        priceDisplay: sanityReading.priceDisplay,
      }
    : (() => {
        const fallback = getReadingById(readingId);
        return fallback
          ? { slug: readingId, name: fallback.name, priceDisplay: fallback.price }
          : null;
      })();

  if (!reading) {
    notFound();
  }

  const aboutLabel =
    bookingForm?.entryPageContent?.aboutJosephineLinkText ??
    ENTRY_PAGE_DEFAULTS.aboutJosephineLinkText;

  return (
    <div className="relative min-h-screen bg-j-ivory overflow-hidden">
      <BookingFlowHeader
        backHref={BOOKING_ROUTES.entry(reading.slug)}
        aboutLinkText={aboutLabel}
      />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10 md:px-12 md:py-14">
            <GiftForm
              readingSlug={reading.slug}
              readingName={reading.name}
              readingPriceDisplay={reading.priceDisplay}
              copy={mergeCopy(giftFormCopy)}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
