import { THANK_YOU_PAGE_DEFAULTS } from "@/data/defaults";
import { GIFT_DELIVERY } from "@/lib/booking/constants";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import type { ThankYouPaidAmount } from "@/lib/booking/thankYouSession";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SanitySiteSettings, SanityThankYouPage } from "@/lib/sanity/types";

import type { ThankYouMode, ThankYouViewProps } from "./ThankYouView";

export type ResolvedThankYouContext = {
  mode: ThankYouMode;
  reading: { name: string; price: string; cents: number | null };
  paidAmount: ThankYouPaidAmount;
  submission: SubmissionRecord | null;
  purchaserFirstName: string | null;
  recipientName: string | null;
};

export type DeriveThankYouViewPropsInput = {
  context: ResolvedThankYouContext;
  thankYouPageContent: SanityThankYouPage | null;
  siteSettings: SanitySiteSettings | null;
  slugForOverride: string;
};

export function deriveThankYouViewProps(input: DeriveThankYouViewPropsInput): ThankYouViewProps {
  const { context, thankYouPageContent, siteSettings, slugForOverride } = input;
  const { mode, reading, paidAmount, purchaserFirstName, recipientName, submission } = context;
  const isPurchaser = mode === "giftPurchaser";
  const isRecipient = mode === "giftRecipient";
  const isSelfSendPurchaser =
    isPurchaser && submission?.giftDeliveryMethod === GIFT_DELIVERY.selfSend;
  const override = thankYouPageContent?.overrides?.find((o) => o.readingSlug === slugForOverride);

  const heading = isPurchaser
    ? (thankYouPageContent?.giftPurchaserHeading ?? THANK_YOU_PAGE_DEFAULTS.giftPurchaserHeading)
    : isRecipient
      ? (thankYouPageContent?.giftRecipientHeading ?? THANK_YOU_PAGE_DEFAULTS.giftRecipientHeading)
      : (override?.heading ??
        thankYouPageContent?.heading ??
        THANK_YOU_PAGE_DEFAULTS.heading);

  const subheading = isSelfSendPurchaser
    ? (thankYouPageContent?.giftPurchaserSelfSendSubheading ??
      THANK_YOU_PAGE_DEFAULTS.giftPurchaserSelfSendSubheading)
    : isPurchaser
      ? (thankYouPageContent?.giftPurchaserSubheading ??
        THANK_YOU_PAGE_DEFAULTS.giftPurchaserSubheading)
      : isRecipient
        ? (thankYouPageContent?.giftRecipientSubheading ??
          THANK_YOU_PAGE_DEFAULTS.giftRecipientSubheading)
        : (override?.subheading ??
          thankYouPageContent?.subheading ??
          THANK_YOU_PAGE_DEFAULTS.subheading);

  const readingLabel = isPurchaser
    ? (thankYouPageContent?.giftPurchaserReadingLabel ??
      THANK_YOU_PAGE_DEFAULTS.giftPurchaserReadingLabel)
    : (thankYouPageContent?.readingLabel ?? THANK_YOU_PAGE_DEFAULTS.readingLabel);

  const confirmationBody = isSelfSendPurchaser
    ? (thankYouPageContent?.giftPurchaserSelfSendBody ??
      THANK_YOU_PAGE_DEFAULTS.giftPurchaserSelfSendBody)
    : isPurchaser
      ? (thankYouPageContent?.giftPurchaserBody ?? THANK_YOU_PAGE_DEFAULTS.giftPurchaserBody)
      : isRecipient
        ? (thankYouPageContent?.giftRecipientBody ?? THANK_YOU_PAGE_DEFAULTS.giftRecipientBody)
        : (override?.confirmationBody ??
          thankYouPageContent?.confirmationBody ??
          THANK_YOU_PAGE_DEFAULTS.confirmationBody);

  const timelineBody = isPurchaser
    ? (thankYouPageContent?.giftPurchaserTimelineBody ??
      THANK_YOU_PAGE_DEFAULTS.giftPurchaserTimelineBody)
    : isRecipient
      ? (thankYouPageContent?.giftRecipientBody ?? THANK_YOU_PAGE_DEFAULTS.giftRecipientBody)
      : (override?.timelineBody ??
        thankYouPageContent?.timelineBody ??
        THANK_YOU_PAGE_DEFAULTS.timelineBody);

  const contactBody = isPurchaser
    ? (thankYouPageContent?.giftPurchaserContactBody ??
      THANK_YOU_PAGE_DEFAULTS.giftPurchaserContactBody)
    : isRecipient
      ? (thankYouPageContent?.giftRecipientContactBody ??
        THANK_YOU_PAGE_DEFAULTS.giftRecipientContactBody)
      : (override?.contactBody ??
        thankYouPageContent?.contactBody ??
        THANK_YOU_PAGE_DEFAULTS.contactBody);

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
        override?.closingMessage ??
        thankYouPageContent?.closingMessage ??
        THANK_YOU_PAGE_DEFAULTS.closingMessage,
      returnButtonText:
        thankYouPageContent?.returnButtonText ?? THANK_YOU_PAGE_DEFAULTS.returnButtonText,
      deliveryDaysPhrase:
        thankYouPageContent?.deliveryDaysPhrase ?? THANK_YOU_PAGE_DEFAULTS.deliveryDaysPhrase,
    },
  };
}
