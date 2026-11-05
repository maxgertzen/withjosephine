import { type GiftContent, THANK_YOU_PAGE_DEFAULTS } from "@/data/defaults";
import type { ThankYouPaidAmount } from "@/lib/booking/thankYouSession";
import { CONTACT_EMAIL } from "@/lib/constants";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
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

  const words = withNonBlankOverrides(withNonBlankOverrides(THANK_YOU_PAGE_DEFAULTS, thankYouPageContent), override);

  return {
    ...(gift ? { icon: "gift" as const } : {}),
    reading,
    paidAmount,
    contactEmail: siteSettings?.contactEmail || CONTACT_EMAIL,
    copy: {
      ...words,
      ...(gift ? recipientGiftCopy(gift) : {}),
    },
  };
}
