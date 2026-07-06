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
