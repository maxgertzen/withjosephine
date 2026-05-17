import { render } from "@react-email/render";
import { NextResponse } from "next/server";

import { STUDIO_ORIGIN_ALLOWLIST } from "@/lib/constants";
import { Day2Started } from "@/lib/emails/Day2Started";
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
import type { EmailTemplateKey } from "@/lib/emails/slots";
import { sanityClient } from "@/lib/sanity/client";
import {
  emailDay2StartedQuery,
  emailDay7DeliveryQuery,
  emailGiftClaimQuery,
  emailGiftPurchaseConfirmationQuery,
  emailMagicLinkQuery,
  emailOrderConfirmationQuery,
  emailPrivacyExportQuery,
} from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

const TEMPLATE_QUERIES: Record<EmailTemplateKey, string> = {
  emailOrderConfirmation: emailOrderConfirmationQuery,
  emailDay2Started: emailDay2StartedQuery,
  emailDay7Delivery: emailDay7DeliveryQuery,
  emailGiftPurchaseConfirmation: emailGiftPurchaseConfirmationQuery,
  emailGiftClaim: emailGiftClaimQuery,
  emailMagicLink: emailMagicLinkQuery,
  emailPrivacyExport: emailPrivacyExportQuery,
};

const TEMPLATE_KEYS = Object.keys(TEMPLATE_QUERIES) as EmailTemplateKey[];

function isAllowedOrigin(value: string | null): boolean {
  if (!value) return false;
  if (STUDIO_ORIGIN_ALLOWLIST.includes(value)) return true;
  if (process.env.NODE_ENV !== "production") {
    if (value.startsWith("http://localhost:") || value.startsWith("http://127.0.0.1:")) {
      return true;
    }
  }
  return false;
}

function refererOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function isStudioRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (isAllowedOrigin(origin)) return true;
  const referer = refererOrigin(request.headers.get("referer"));
  if (isAllowedOrigin(referer)) return true;
  return false;
}

async function fetchDraftCopy(template: EmailTemplateKey): Promise<unknown | null> {
  const token = process.env.SANITY_READ_TOKEN;
  if (!token) return null;
  const draftClient = sanityClient.withConfig({
    token,
    useCdn: false,
    perspective: "previewDrafts",
  });
  return draftClient.fetch(TEMPLATE_QUERIES[template]);
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
    case "emailDay2Started":
      return render(
        <Day2Started
          vars={{ firstName: PREVIEW_FIXTURE.firstName }}
          copy={merged as typeof PREVIEW_DEFAULTS.emailDay2Started}
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
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> },
): Promise<Response> {
  if (!isStudioRequest(request)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const { type } = await params;
  if (!TEMPLATE_KEYS.includes(type as EmailTemplateKey)) {
    return new NextResponse("unknown email template", { status: 404 });
  }
  const template = type as EmailTemplateKey;
  const sanityCopy = await fetchDraftCopy(template).catch(() => null);
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
