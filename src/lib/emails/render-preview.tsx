import { render } from "@react-email/render";

import { pickDefined } from "@/lib/sanity/pickDefined";

import { Day7Delivery } from "./Day7Delivery";
import { MagicLink } from "./MagicLink";
import { NewDeviceNotice } from "./NewDeviceNotice";
import { OrderConfirmation } from "./OrderConfirmation";
import { PREVIEW_DEFAULTS, PREVIEW_FIXTURE } from "./preview-fixtures";
import { PrivacyExport } from "./PrivacyExport";
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
  "emailMagicLink",
  "emailMagicLinkLibrary",
  "emailPrivacyExport",
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
    case "emailMagicLink":
    case "emailMagicLinkLibrary": {
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
            submissionCount: PREVIEW_FIXTURE.submissionCount,
            expiryDays: PREVIEW_FIXTURE.expiryDays,
          }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailPrivacyExport}
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
