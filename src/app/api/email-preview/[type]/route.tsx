import { render } from "@react-email/render";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import { NextResponse } from "next/server";

import { Day7Delivery } from "@/lib/emails/Day7Delivery";
import { GiftClaimEmail } from "@/lib/emails/GiftClaimEmail";
import { GiftPurchaseConfirmation } from "@/lib/emails/GiftPurchaseConfirmation";
import { MagicLink } from "@/lib/emails/MagicLink";
import { OrderConfirmation } from "@/lib/emails/OrderConfirmation";
import {
  PREVIEW_DEFAULTS,
  PREVIEW_FIXTURE,
} from "@/lib/emails/preview-fixtures";
import { PrivacyExport } from "@/lib/emails/PrivacyExport";
import { RecipientIntakeReceived } from "@/lib/emails/RecipientIntakeReceived";
import type { EmailTemplateKey } from "@/lib/emails/slots";
import { sanityClient } from "@/lib/sanity/client";
import {
  emailDay7DeliveryQuery,
  emailGiftClaimQuery,
  emailGiftPurchaseConfirmationQuery,
  emailMagicLinkQuery,
  emailOrderConfirmationQuery,
  emailPrivacyExportQuery,
  emailRecipientIntakeReceivedQuery,
} from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

const TEMPLATE_QUERIES: Record<EmailTemplateKey, string> = {
  emailOrderConfirmation: emailOrderConfirmationQuery,
  emailDay7Delivery: emailDay7DeliveryQuery,
  emailGiftPurchaseConfirmation: emailGiftPurchaseConfirmationQuery,
  emailGiftClaim: emailGiftClaimQuery,
  emailMagicLink: emailMagicLinkQuery,
  emailPrivacyExport: emailPrivacyExportQuery,
  emailRecipientIntakeReceived: emailRecipientIntakeReceivedQuery,
};

const TEMPLATE_KEYS = Object.keys(TEMPLATE_QUERIES) as EmailTemplateKey[];

class PreviewTokenMissingError extends Error {
  constructor() {
    super("SANITY_READ_TOKEN is not set on this worker");
    this.name = "PreviewTokenMissingError";
  }
}

function readClient() {
  const token = process.env.SANITY_READ_TOKEN;
  if (!token) throw new PreviewTokenMissingError();
  return sanityClient.withConfig({ token, useCdn: false });
}

async function fetchDraftCopy(template: EmailTemplateKey): Promise<unknown | null> {
  return readClient()
    .withConfig({ perspective: "previewDrafts" })
    .fetch(TEMPLATE_QUERIES[template]);
}

async function verifyPreviewSecret(request: Request): Promise<boolean> {
  const result = await validatePreviewUrl(readClient(), request.url);
  return result.isValid;
}

async function renderTemplate(template: EmailTemplateKey, sanityCopy: unknown): Promise<string> {
  const merged = { ...PREVIEW_DEFAULTS[template], ...(sanityCopy as object | null ?? {}) };
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
    case "emailMagicLink": {
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
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<Response> {
  const { type } = await params;
  if (!TEMPLATE_KEYS.includes(type as EmailTemplateKey)) {
    return new NextResponse("unknown email template", { status: 404 });
  }
  const template = type as EmailTemplateKey;
  let sanityCopy: unknown = null;
  try {
    const secretValid = await verifyPreviewSecret(request);
    if (!secretValid) {
      return new NextResponse("forbidden", {
        status: 403,
        headers: {
          "x-preview-reason": "invalid-secret",
          "cache-control": "private, no-store, max-age=0",
        },
      });
    }
    sanityCopy = await fetchDraftCopy(template);
  } catch (error) {
    if (error instanceof PreviewTokenMissingError) {
      console.error(
        "[email-preview] SANITY_READ_TOKEN missing on worker — preview cannot fetch draft copy. Set the secret with: pnpm exec wrangler secret put SANITY_READ_TOKEN --env <env>",
      );
      return new NextResponse("preview unavailable", {
        status: 503,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-preview-reason": "token-missing",
          "cache-control": "private, no-store, max-age=0",
        },
      });
    }
    sanityCopy = null;
  }
  const html = await renderTemplate(template, sanityCopy);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
