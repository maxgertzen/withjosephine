import { render } from "@react-email/render";

import { pickDefined } from "@/lib/sanity/pickDefined";

import { GiftOpened } from "./GiftOpened";
import { GiftPurchase } from "./GiftPurchase";
import { GiftRecipientConfirmation } from "./GiftRecipientConfirmation";
import { MagicLink } from "./MagicLink";
import { OrderConfirmation } from "./OrderConfirmation";
import { PREVIEW_DEFAULTS, PREVIEW_FIXTURE, PREVIEW_GIFT } from "./preview-fixtures";
import { PrivacyExport } from "./PrivacyExport";
import { ReadingDelivery } from "./ReadingDelivery";
import type { EmailTemplateKey } from "./slots";

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
  "emailReadingDelivery",
  "emailMagicLink",
  "emailPrivacyExport",
  "emailGiftPurchase",
  "emailGiftOpened",
  "emailGiftRecipientConfirmation",
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
  type TemplateDefaults = (typeof PREVIEW_DEFAULTS)[typeof template];
  const merged = {
    ...PREVIEW_DEFAULTS[template],
    ...pickDefined((sanityCopy as Partial<TemplateDefaults> | null) ?? {}),
  };
  switch (template) {
    case "emailOrderConfirmation":
      return render(
        <OrderConfirmation
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
            amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
            dataExportUrl: PREVIEW_FIXTURE.dataExportUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailOrderConfirmation}
        />,
      );
    case "emailReadingDelivery":
      return render(
        <ReadingDelivery
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
            readingName: PREVIEW_FIXTURE.readingName,
            listenUrl: PREVIEW_FIXTURE.listenUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailReadingDelivery}
        />,
      );
    case "emailMagicLink": {
      const copy = merged as typeof PREVIEW_DEFAULTS.emailMagicLink;
      return render(
        <MagicLink
          vars={{
            magicLinkUrl: PREVIEW_FIXTURE.magicLinkUrl,
            firstName: PREVIEW_FIXTURE.firstName,
            readingName: PREVIEW_FIXTURE.readingName,
            readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
          }}
          copy={{
            preview: copy.preview,
            heroLine: copy.heroLine,
            buttonLabel: copy.buttonLabel,
            body: copy.body,
          }}
        />,
      );
    }
    case "emailPrivacyExport":
      return render(
        <PrivacyExport
          vars={{
            firstName: PREVIEW_FIXTURE.firstName,
            downloadUrl: PREVIEW_FIXTURE.downloadUrl,
            expiryDays: PREVIEW_FIXTURE.expiryDays,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailPrivacyExport}
        />,
      );
    case "emailGiftPurchase":
      return render(
        <GiftPurchase
          vars={{
            firstName: PREVIEW_GIFT.buyerFirstName,
            readingName: PREVIEW_GIFT.readingName,
            hasNote: true,
            displayCode: PREVIEW_GIFT.code,
            giftUrl: PREVIEW_GIFT.giftUrl,
            whatsappUrl: PREVIEW_GIFT.whatsappUrl,
            sendUrl: PREVIEW_GIFT.sendUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftPurchase}
        />,
      );
    case "emailGiftOpened":
      return render(
        <GiftOpened
          vars={{
            firstName: PREVIEW_GIFT.buyerFirstName,
            recipientName: PREVIEW_GIFT.recipientFirstName,
            readingName: PREVIEW_GIFT.readingName,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftOpened}
        />,
      );
    case "emailGiftRecipientConfirmation":
      return render(
        <GiftRecipientConfirmation
          vars={{
            firstName: PREVIEW_GIFT.recipientFirstName,
            buyerFirstName: PREVIEW_GIFT.buyerFirstName,
            readingName: PREVIEW_GIFT.readingName,
            dataExportUrl: PREVIEW_FIXTURE.dataExportUrl,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailGiftRecipientConfirmation}
        />,
      );
    default: {
      const _exhaustive: never = template;
      throw new Error(`Unhandled template: ${String(_exhaustive)}`);
    }
  }
}
