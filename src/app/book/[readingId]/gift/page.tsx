import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BookingPageShell } from "@/components/BookingPageShell";
import { GiftForm } from "@/components/GiftForm";
import { SignOutForm } from "@/components/SignOutForm";
import {
  BOOKING_GIFT_FORM_DEFAULTS,
  type BookingGiftFormContent,
} from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { getSignedInUser } from "@/lib/auth/sessionUser";
import { BOOKING_PAGE_ROUTES } from "@/lib/http/routes";
import {
  fetchBookingGiftForm,
  fetchReading,
} from "@/lib/sanity/fetch";
import type { SanityBookingGiftForm } from "@/lib/sanity/types";

// Dynamic (no generateStaticParams): reads the session cookie to lock the
// purchaser email to the signed-in account.

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

export default function GiftPage({ params }: GiftPageProps) {
  return (
    <Suspense fallback={null}>
      <GiftPageContent params={params} />
    </Suspense>
  );
}

async function GiftPageContent({ params }: GiftPageProps) {
  const { readingId } = await params;

  const [sanityReading, giftFormCopy, signedInUser] = await Promise.all([
    fetchReading(readingId),
    fetchBookingGiftForm(),
    getSignedInUser(),
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

  return (
    <BookingPageShell
      backHref={BOOKING_PAGE_ROUTES.entry(reading.slug)}
      outerBg="ivory"
    >
      {signedInUser ? (
        <div className="font-body text-sm text-j-text-muted max-w-[50ch] mx-auto text-center mb-6">
          Signed in as {signedInUser.email}, so your receipt and gift link go here and
          the purchase is saved to your library.{" "}
          <SignOutForm className="inline" buttonClassName="underline hover:text-j-text-heading transition-colors" />{" "}
          to use a different account.
        </div>
      ) : null}

      <GiftForm
        readingSlug={reading.slug}
        readingName={reading.name}
        readingPriceDisplay={reading.priceDisplay}
        copy={mergeCopy(giftFormCopy)}
        prefilledEmail={signedInUser?.email ?? null}
      />
    </BookingPageShell>
  );
}
