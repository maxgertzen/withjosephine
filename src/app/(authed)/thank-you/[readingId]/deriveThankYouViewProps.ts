import { type GiftContent, THANK_YOU_PAGE_DEFAULTS } from "@/data/defaults";
import type { ThankYouPaidAmount } from "@/lib/booking/thankYouSession";
import { CONTACT_EMAIL } from "@/lib/constants";
import { applyTokens } from "@/lib/emails/applyTokens";
import type { SanitySiteSettings, SanityThankYouPage } from "@/lib/sanity/types";

import type { ThankYouViewCopy, ThankYouViewProps } from "./ThankYouView";

export type ResolvedThankYouContext = {
  reading: { name: string; price: string | null; cents: number | null };
  paidAmount: ThankYouPaidAmount;
};

export type RecipientGiftThankYou = {
  recipientName: string;
  buyerFirstName: string;
  giftCopy: GiftContent;
};

export type DeriveThankYouViewPropsInput = {
  context: ResolvedThankYouContext;
  thankYouPageContent: SanityThankYouPage | null;
  siteSettings: SanitySiteSettings | null;
  slugForOverride: string;
  gift?: RecipientGiftThankYou;
};

type RecipientGiftCopy = Pick<
  ThankYouViewCopy,
  "heading" | "subheading" | "readingLabel" | "timelineBody"
>;

function recipientGiftCopy({
  recipientName,
  buyerFirstName,
  giftCopy,
}: RecipientGiftThankYou): RecipientGiftCopy {
  return {
    heading: applyTokens(giftCopy.recipientThankYouHeadingTemplate, { recipientName }),
    subheading: giftCopy.recipientThankYouSubheading,
    readingLabel: buyerFirstName
      ? applyTokens(giftCopy.recipientThankYouCardLabelTemplate, { buyerName: buyerFirstName })
      : giftCopy.recipientThankYouCardLabelNoBuyer,
    timelineBody: giftCopy.recipientThankYouTimelineTemplate,
  };
}

export function deriveThankYouViewProps(input: DeriveThankYouViewPropsInput): ThankYouViewProps {
  const { context, thankYouPageContent, siteSettings, slugForOverride, gift } = input;
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
    ...(gift ? { icon: "gift" as const } : {}),
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
      ...(gift ? recipientGiftCopy(gift) : {}),
    },
  };
}
