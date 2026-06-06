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

const RECIPIENT_TIMELINE_BODY_DEFAULT =
  "I’ll begin your reading within the next two days, and I’ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.";

const GENERIC_CONTACT_BODY_DEFAULT =
  "If anything comes up — a question, a detail you forgot to mention, or anything that doesn’t look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.";

export function deriveThankYouViewProps(input: DeriveThankYouViewPropsInput): ThankYouViewProps {
  const { context, thankYouPageContent, siteSettings, slugForOverride } = input;
  const { mode, reading, paidAmount, purchaserFirstName, recipientName, submission } = context;
  const isPurchaser = mode === "giftPurchaser";
  const isRecipient = mode === "giftRecipient";
  const isSelfSendPurchaser =
    isPurchaser && submission?.giftDeliveryMethod === GIFT_DELIVERY.selfSend;
  const override = thankYouPageContent?.overrides?.find((o) => o.readingSlug === slugForOverride);

  const heading = isPurchaser
    ? (thankYouPageContent?.giftPurchaserHeading ??
      "Thank you, {purchaserFirstName}. Your gift is on its way.")
    : isRecipient
      ? (thankYouPageContent?.giftRecipientHeading ??
        "Thank you, {recipientName}. Your reading is in my hands now.")
      : (override?.heading ??
        thankYouPageContent?.heading ??
        "Thank you. I’ve got everything I need.");

  const subheading = isSelfSendPurchaser
    ? (thankYouPageContent?.giftPurchaserSelfSendSubheading ??
      "Your gift link is ready in the email I just sent — share it with them whenever feels right.")
    : isPurchaser
      ? (thankYouPageContent?.giftPurchaserSubheading ??
        "I'll take it from here. The recipient will receive a note from me with their claim link.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientSubheading ??
          "I've received everything I need to begin.")
        : (override?.subheading ??
          thankYouPageContent?.subheading ??
          "Your reading is in my hands now.");

  const readingLabel = isPurchaser
    ? (thankYouPageContent?.giftPurchaserReadingLabel ?? "Your gift")
    : (thankYouPageContent?.readingLabel ?? "Your Reading");

  const confirmationBody = isSelfSendPurchaser
    ? (thankYouPageContent?.giftPurchaserSelfSendBody ??
      "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready — they'll claim from there.")
    : isPurchaser
      ? (thankYouPageContent?.giftPurchaserBody ??
        "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link — they'll share their intake details with me from there.")
      : isRecipient
        ? (thankYouPageContent?.giftRecipientBody ?? RECIPIENT_TIMELINE_BODY_DEFAULT)
        : (override?.confirmationBody ??
          thankYouPageContent?.confirmationBody ??
          "A confirmation email is on its way to your inbox in the next minute or two. If you can’t find it, please check your promotions folder.");

  const timelineBody = isPurchaser
    ? (thankYouPageContent?.giftPurchaserTimelineBody ??
      "I’ll begin the recipient’s reading within the next two days of them claiming the gift, and I’ll send them a short note when I do. Their voice note and PDF will arrive within {deliveryDays}, sent to the email they use to claim.")
    : isRecipient
      ? (thankYouPageContent?.giftRecipientBody ?? RECIPIENT_TIMELINE_BODY_DEFAULT)
      : (override?.timelineBody ??
        thankYouPageContent?.timelineBody ??
        "I’ll begin your reading within the next two days, and I’ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.");

  const contactBody = isPurchaser
    ? (thankYouPageContent?.giftPurchaserContactBody ??
      "If anything comes up with the gift — a wrong recipient email, a change of plan, anything that doesn’t look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.")
    : isRecipient
      ? (thankYouPageContent?.giftRecipientContactBody ?? GENERIC_CONTACT_BODY_DEFAULT)
      : (override?.contactBody ??
        thankYouPageContent?.contactBody ??
        GENERIC_CONTACT_BODY_DEFAULT);

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
        "With love, Josephine ✦",
      returnButtonText: thankYouPageContent?.returnButtonText ?? "Return to Home",
      deliveryDaysPhrase: thankYouPageContent?.deliveryDaysPhrase ?? "seven days",
    },
  };
}
