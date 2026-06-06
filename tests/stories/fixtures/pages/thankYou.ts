import type { ThankYouViewCopy } from "@/app/(authed)/thank-you/[readingId]/ThankYouView";
import { THANK_YOU_PAGE_DEFAULTS } from "@/data/defaults";

export const THANK_YOU_BASE_COPY: ThankYouViewCopy = {
  heading: THANK_YOU_PAGE_DEFAULTS.heading,
  subheading: THANK_YOU_PAGE_DEFAULTS.subheading,
  readingLabel: THANK_YOU_PAGE_DEFAULTS.readingLabel,
  confirmationBody: THANK_YOU_PAGE_DEFAULTS.confirmationBody,
  timelineBody: THANK_YOU_PAGE_DEFAULTS.timelineBody,
  contactBody: THANK_YOU_PAGE_DEFAULTS.contactBody,
  closingMessage: THANK_YOU_PAGE_DEFAULTS.closingMessage,
  returnButtonText: THANK_YOU_PAGE_DEFAULTS.returnButtonText,
  deliveryDaysPhrase: THANK_YOU_PAGE_DEFAULTS.deliveryDaysPhrase,
};

export const THANK_YOU_READING = {
  name: "Soul Blueprint",
  price: "$179",
  cents: 17900,
} as const;

export const THANK_YOU_GIFT_PURCHASER_COPY: ThankYouViewCopy = {
  ...THANK_YOU_BASE_COPY,
  heading: THANK_YOU_PAGE_DEFAULTS.giftPurchaserHeading,
  subheading: THANK_YOU_PAGE_DEFAULTS.giftPurchaserSubheading,
  readingLabel: THANK_YOU_PAGE_DEFAULTS.giftPurchaserReadingLabel,
  confirmationBody: THANK_YOU_PAGE_DEFAULTS.giftPurchaserBody,
  timelineBody: THANK_YOU_PAGE_DEFAULTS.giftPurchaserTimelineBody,
  contactBody: THANK_YOU_PAGE_DEFAULTS.giftPurchaserContactBody,
};

export const THANK_YOU_GIFT_PURCHASER_SELF_SEND_COPY: ThankYouViewCopy = {
  ...THANK_YOU_GIFT_PURCHASER_COPY,
  subheading: THANK_YOU_PAGE_DEFAULTS.giftPurchaserSelfSendSubheading,
  confirmationBody: THANK_YOU_PAGE_DEFAULTS.giftPurchaserSelfSendBody,
};

export const THANK_YOU_GIFT_RECIPIENT_COPY: ThankYouViewCopy = {
  ...THANK_YOU_BASE_COPY,
  heading: THANK_YOU_PAGE_DEFAULTS.giftRecipientHeading,
  subheading: THANK_YOU_PAGE_DEFAULTS.giftRecipientSubheading,
  timelineBody: THANK_YOU_PAGE_DEFAULTS.giftRecipientBody,
  contactBody: THANK_YOU_PAGE_DEFAULTS.giftRecipientContactBody,
};
