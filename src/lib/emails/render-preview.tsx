import { render } from "@react-email/render";

import { Day7Delivery } from "./Day7Delivery";
import { GiftClaimEmail } from "./GiftClaimEmail";
import { GiftClaimReminderEmail } from "./GiftClaimReminderEmail";
import { GiftPurchaseConfirmationScheduled } from "./GiftPurchaseConfirmationScheduled";
import { GiftPurchaseConfirmationSelfSend } from "./GiftPurchaseConfirmationSelfSend";
import { MagicLink } from "./MagicLink";
import { NewDeviceNotice } from "./NewDeviceNotice";
import { OrderConfirmation } from "./OrderConfirmation";
import { PREVIEW_DEFAULTS, PREVIEW_FIXTURE } from "./preview-fixtures";
import { PrivacyExport } from "./PrivacyExport";
import { RecipientIntakeReceived } from "./RecipientIntakeReceived";
import type { EmailTemplateKey } from "./slots";
import { StepUpOtp } from "./StepUpOtp";

/**
 * `@react-email/render` injects `<link rel="expect" href="#_R_" blocking="render">`
 * into the rendered HTML's <head> as a React Suspense coordination hint. When
 * the rendered HTML is shown via iframe `srcDoc` with `sandbox=""` (no scripts),
 * the React runtime that would satisfy the blocking expectation never executes
 * — the iframe stays blank forever. The hint has no meaning inside an email
 * client either; strip it on the way out.
 */
function stripRenderBlockers(html: string): string {
  return html.replace(/<link[^>]+blocking="render"[^>]*\/?>/g, "");
}

export const PREVIEW_TEMPLATE_KEYS: readonly EmailTemplateKey[] = [
  "emailOrderConfirmation",
  "emailDay7Delivery",
  "emailGiftPurchaseConfirmationSelfSend",
  "emailGiftPurchaseConfirmationScheduled",
  "emailGiftClaim",
  "emailGiftClaimReminder",
  "emailMagicLink",
  "emailMagicLinkLibrary",
  "emailPrivacyExport",
  "emailRecipientIntakeReceived",
  "emailStepUpOtp",
  "emailNewDeviceNotice",
] as const;

export function isPreviewTemplateKey(value: unknown): value is EmailTemplateKey {
  return typeof value === "string" && (PREVIEW_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export async function renderEmailPreview(
  template: EmailTemplateKey,
  sanityCopy: unknown,
): Promise<string> {
  const raw = await renderRaw(template, sanityCopy);
  return stripRenderBlockers(raw);
}

async function renderRaw(
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
            listenUrl: PREVIEW_FIXTURE.listenUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailDay7Delivery}
        />,
      );
    case "emailGiftPurchaseConfirmationSelfSend":
      return render(
        <GiftPurchaseConfirmationSelfSend
          vars={{
            claimUrl: PREVIEW_FIXTURE.claimUrl,
            purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
            recipientName: PREVIEW_FIXTURE.recipientName,
            giftMessage: PREVIEW_FIXTURE.giftMessage,
            myGiftsUrl: PREVIEW_FIXTURE.myGiftsUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftPurchaseConfirmationSelfSend}
        />,
      );
    case "emailGiftPurchaseConfirmationScheduled":
      return render(
        <GiftPurchaseConfirmationScheduled
          vars={{
            sendAtDisplay: PREVIEW_FIXTURE.sendAtDisplay,
            purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
            recipientName: PREVIEW_FIXTURE.recipientName,
            giftMessage: PREVIEW_FIXTURE.giftMessage,
            myGiftsUrl: PREVIEW_FIXTURE.myGiftsUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftPurchaseConfirmationScheduled}
        />,
      );
    case "emailGiftClaim":
      return render(
        <GiftClaimEmail
          vars={{
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
    case "emailGiftClaimReminder":
      return render(
        <GiftClaimReminderEmail
          vars={{
            recipientName: PREVIEW_FIXTURE.recipientName,
            purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            giftMessage: PREVIEW_FIXTURE.giftMessage,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftClaimReminder}
        />,
      );
    case "emailMagicLink":
    case "emailMagicLinkLibrary": {
      const copy = merged as typeof PREVIEW_DEFAULTS.emailMagicLink;
      return render(
        <MagicLink
          magicLinkUrl={PREVIEW_FIXTURE.magicLinkUrl}
          preview={copy.preview}
          heroLine={copy.heroLine}
          buttonLabel={copy.buttonLabel}
          body={copy.body}
        />,
      );
    }
    case "emailPrivacyExport":
      return render(
        <PrivacyExport
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
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
    case "emailStepUpOtp":
      return render(
        <StepUpOtp
          code={PREVIEW_FIXTURE.stepUpOtpCode}
          copy={merged as typeof PREVIEW_DEFAULTS.emailStepUpOtp}
        />,
      );
    case "emailNewDeviceNotice":
      return render(
        <NewDeviceNotice
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
            revokeUrl: PREVIEW_FIXTURE.revokeUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailNewDeviceNotice}
        />,
      );
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unhandled template: ${String(_exhaustive)}`);
    }
  }
}
