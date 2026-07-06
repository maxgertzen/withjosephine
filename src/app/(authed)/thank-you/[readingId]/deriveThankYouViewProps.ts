import { THANK_YOU_PAGE_DEFAULTS } from "@/data/defaults";
import type { ThankYouPaidAmount } from "@/lib/booking/thankYouSession";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SanitySiteSettings, SanityThankYouPage } from "@/lib/sanity/types";

import type { ThankYouViewProps } from "./ThankYouView";

export type ResolvedThankYouContext = {
  reading: { name: string; price: string; cents: number | null };
  paidAmount: ThankYouPaidAmount;
};

export type DeriveThankYouViewPropsInput = {
  context: ResolvedThankYouContext;
  thankYouPageContent: SanityThankYouPage | null;
  siteSettings: SanitySiteSettings | null;
  slugForOverride: string;
};

export function deriveThankYouViewProps(input: DeriveThankYouViewPropsInput): ThankYouViewProps {
  const { context, thankYouPageContent, siteSettings, slugForOverride } = input;
  const { reading, paidAmount } = context;
  const override = thankYouPageContent?.overrides?.find((o) => o.readingSlug === slugForOverride);

  const heading =
    override?.heading ?? thankYouPageContent?.heading ?? THANK_YOU_PAGE_DEFAULTS.heading;

  const subheading =
    override?.subheading ?? thankYouPageContent?.subheading ?? THANK_YOU_PAGE_DEFAULTS.subheading;

  const readingLabel = thankYouPageContent?.readingLabel ?? THANK_YOU_PAGE_DEFAULTS.readingLabel;

  const confirmationBody =
    override?.confirmationBody ??
    thankYouPageContent?.confirmationBody ??
    THANK_YOU_PAGE_DEFAULTS.confirmationBody;

  const timelineBody =
    override?.timelineBody ??
    thankYouPageContent?.timelineBody ??
    THANK_YOU_PAGE_DEFAULTS.timelineBody;

  const contactBody =
    override?.contactBody ??
    thankYouPageContent?.contactBody ??
    THANK_YOU_PAGE_DEFAULTS.contactBody;

  return {
    reading,
    paidAmount,
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
