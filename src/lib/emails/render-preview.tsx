import { render } from "@react-email/render";

import { Day7Delivery } from "./Day7Delivery";
import { GiftClaimEmail } from "./GiftClaimEmail";
import { GiftPurchaseConfirmation } from "./GiftPurchaseConfirmation";
import { MagicLink } from "./MagicLink";
import { OrderConfirmation } from "./OrderConfirmation";
import { PREVIEW_DEFAULTS, PREVIEW_FIXTURE } from "./preview-fixtures";
import { PrivacyExport } from "./PrivacyExport";
import { RecipientIntakeReceived } from "./RecipientIntakeReceived";
import type { EmailTemplateKey } from "./slots";

export const PREVIEW_TEMPLATE_KEYS: readonly EmailTemplateKey[] = [
  "emailOrderConfirmation",
  "emailDay7Delivery",
  "emailGiftPurchaseConfirmation",
  "emailGiftClaim",
  "emailMagicLink",
  "emailMagicLinkMyReadings",
  "emailMagicLinkMyGifts",
  "emailPrivacyExport",
  "emailRecipientIntakeReceived",
] as const;

export function isPreviewTemplateKey(value: unknown): value is EmailTemplateKey {
  return typeof value === "string" && (PREVIEW_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export async function renderEmailPreview(
  template: EmailTemplateKey,
  sanityCopy: unknown,
): Promise<string> {
  const merged = { ...PREVIEW_DEFAULTS[template], ...((sanityCopy as object | null) ?? {}) };
  switch (template) {
    case "emailOrderConfirmation":
      return render(
        <OrderConfirmation
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailOrderConfirmation}
        />,
      );
    case "emailDay7Delivery":
      return render(
        <Day7Delivery
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            listenUrl: PREVIEW_FIXTURE.listenUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailDay7Delivery}
        />,
      );
    case "emailGiftPurchaseConfirmation":
      return render(
        <GiftPurchaseConfirmation
          vars={{
            variant: "self_send",
            claimUrl: PREVIEW_FIXTURE.claimUrl,
            purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
            recipientName: PREVIEW_FIXTURE.recipientName,
            giftMessage: PREVIEW_FIXTURE.giftMessage,
            myGiftsUrl: PREVIEW_FIXTURE.myGiftsUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftPurchaseConfirmation}
        />,
      );
    case "emailGiftClaim":
      return render(
        <GiftClaimEmail
          vars={{
            variant: "first_send",
            claimUrl: PREVIEW_FIXTURE.claimUrl,
            recipientName: PREVIEW_FIXTURE.recipientName,
            purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            giftMessage: PREVIEW_FIXTURE.giftMessage,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftClaim}
        />,
      );
    case "emailMagicLink":
    case "emailMagicLinkMyReadings":
    case "emailMagicLinkMyGifts": {
      const copy = merged as typeof PREVIEW_DEFAULTS.emailMagicLink;
      return render(
        <MagicLink
          magicLinkUrl={PREVIEW_FIXTURE.magicLinkUrl}
          preview={copy.preview}
          greeting={copy.greeting}
          body={copy.body}
          signOff={copy.signOff}
        />,
      );
    }
    case "emailPrivacyExport":
      return render(
        <PrivacyExport
          vars={{
            downloadUrl: PREVIEW_FIXTURE.downloadUrl,
            submissionCount: PREVIEW_FIXTURE.submissionCount,
            expiryDays: PREVIEW_FIXTURE.expiryDays,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailPrivacyExport}
        />,
      );
    case "emailRecipientIntakeReceived":
      return render(
        <RecipientIntakeReceived
          vars={{
            recipientName: PREVIEW_FIXTURE.recipientName,
            purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
            readingName: PREVIEW_FIXTURE.readingName,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailRecipientIntakeReceived}
        />,
      );
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unhandled template: ${String(_exhaustive)}`);
    }
  }
}
