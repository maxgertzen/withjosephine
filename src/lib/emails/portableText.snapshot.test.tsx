import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import {
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_GIFT_CLAIM_DEFAULTS,
  EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
  type EmailRichText,
} from "@/data/defaults";

import { Day7Delivery } from "./Day7Delivery";
import { GiftClaimEmail } from "./GiftClaimEmail";
import { GiftPurchaseConfirmationSelfSend } from "./GiftPurchaseConfirmationSelfSend";
import { MagicLink } from "./MagicLink";
import { OrderConfirmation } from "./OrderConfirmation";
import { PREVIEW_FIXTURE } from "./preview-fixtures";
import { PrivacyExport } from "./PrivacyExport";
import { RecipientIntakeReceived } from "./RecipientIntakeReceived";

function ptBlock(text: string) {
  return {
    _type: "block" as const,
    _key: text.slice(0, 8),
    style: "normal" as const,
    markDefs: [],
    children: [{ _type: "span" as const, _key: `${text.slice(0, 8)}-s0`, text, marks: [] }],
  };
}

function pt(text: string) {
  return [ptBlock(text)];
}

function stripWhitespace(html: string): string {
  // Normalise rendering differences that don't affect customer-visible output:
  // collapse whitespace runs, strip empty attributes, drop comments.
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

describe("Portable Text body fallback parity (legacy-fields branch)", () => {
  it("OrderConfirmation — legacy string vs PT array produce identical HTML", async () => {
    const vars = {
      firstName: PREVIEW_FIXTURE.firstName,
      readingName: PREVIEW_FIXTURE.readingName,
      readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
      amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
    };
    const legacyCopy = {
      ...EMAIL_ORDER_CONFIRMATION_DEFAULTS,
      body: undefined,
    };
    const stringRender = await render(<OrderConfirmation vars={vars} copy={legacyCopy} />);
    const ptRender = await render(
      <OrderConfirmation
        vars={vars}
        copy={{
          ...legacyCopy,
          thanksLine: pt(EMAIL_ORDER_CONFIRMATION_DEFAULTS.thanksLine as string),
          timelineLine: pt(EMAIL_ORDER_CONFIRMATION_DEFAULTS.timelineLine as string),
          contactLine: pt(EMAIL_ORDER_CONFIRMATION_DEFAULTS.contactLine as string),
        }}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });

  it("RecipientIntakeReceived — legacy string vs PT array produce identical HTML", async () => {
    const vars = {
      recipientName: PREVIEW_FIXTURE.recipientName,
      purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
      readingName: PREVIEW_FIXTURE.readingName,
    };
    const legacyCopy = {
      ...EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
      body: undefined,
    };
    const stringRender = await render(
      <RecipientIntakeReceived vars={vars} copy={legacyCopy} />,
    );
    const ptRender = await render(
      <RecipientIntakeReceived
        vars={vars}
        copy={{
          ...legacyCopy,
          thanksLine: pt(EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS.thanksLine as string),
          timelineLine: pt(EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS.timelineLine as string),
          contactLine: pt(EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS.contactLine as string),
        }}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });

  it("Day7Delivery — legacy string vs PT array produce identical HTML", async () => {
    const vars = {
      firstName: PREVIEW_FIXTURE.firstName,
      readingName: PREVIEW_FIXTURE.readingName,
      readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
      listenUrl: PREVIEW_FIXTURE.listenUrl,
    };
    const legacyCopy = {
      ...EMAIL_DAY7_DELIVERY_DEFAULTS,
      bodyIntro: undefined,
      bodyPostButton: undefined,
    };
    const stringRender = await render(<Day7Delivery vars={vars} copy={legacyCopy} />);
    const ptRender = await render(
      <Day7Delivery
        vars={vars}
        copy={{
          ...legacyCopy,
          comfortLine: pt(EMAIL_DAY7_DELIVERY_DEFAULTS.comfortLine as string),
          signedInDisclosure: pt(EMAIL_DAY7_DELIVERY_DEFAULTS.signedInDisclosure as string),
          comfortFollowUp: pt(EMAIL_DAY7_DELIVERY_DEFAULTS.comfortFollowUp as string),
        }}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });

  it("MagicLink — string[] vs PT body produce identical HTML", async () => {
    const stringRender = await render(
      <MagicLink
        magicLinkUrl={PREVIEW_FIXTURE.magicLinkUrl}
        preview={EMAIL_MAGIC_LINK_DEFAULTS.preview}
        greeting={EMAIL_MAGIC_LINK_DEFAULTS.greeting}
        body={EMAIL_MAGIC_LINK_DEFAULTS.body}
        signOff={EMAIL_MAGIC_LINK_DEFAULTS.signOff}
      />,
    );
    const ptBody = (EMAIL_MAGIC_LINK_DEFAULTS.body as string[]).map(ptBlock);
    const ptRender = await render(
      <MagicLink
        magicLinkUrl={PREVIEW_FIXTURE.magicLinkUrl}
        preview={EMAIL_MAGIC_LINK_DEFAULTS.preview}
        greeting={EMAIL_MAGIC_LINK_DEFAULTS.greeting}
        body={ptBody as EmailRichText}
        signOff={EMAIL_MAGIC_LINK_DEFAULTS.signOff}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });

  it("GiftPurchaseConfirmationSelfSend — legacy string vs PT array produce identical HTML", async () => {
    const vars = {
      claimUrl: PREVIEW_FIXTURE.claimUrl,
      purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
      readingName: PREVIEW_FIXTURE.readingName,
      readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
      amountPaidDisplay: PREVIEW_FIXTURE.amountPaidDisplay,
      recipientName: PREVIEW_FIXTURE.recipientName,
      giftMessage: PREVIEW_FIXTURE.giftMessage,
      myGiftsUrl: PREVIEW_FIXTURE.myGiftsUrl,
    };
    const legacyCopy = {
      ...EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
      body: undefined,
    };
    const stringRender = await render(
      <GiftPurchaseConfirmationSelfSend vars={vars} copy={legacyCopy} />,
    );
    const ptRender = await render(
      <GiftPurchaseConfirmationSelfSend
        vars={vars}
        copy={{
          ...legacyCopy,
          detailLineSelfSend: pt(
            EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS.detailLineSelfSend as string,
          ),
          shareUrlHelper: pt(
            EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS.shareUrlHelper as string,
          ),
          refundLine: pt(
            EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS.refundLine as string,
          ),
        }}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });

  it("GiftClaimEmail — legacy string vs PT array produce identical HTML", async () => {
    const vars = {
      claimUrl: PREVIEW_FIXTURE.claimUrl,
      recipientName: PREVIEW_FIXTURE.recipientName,
      purchaserFirstName: PREVIEW_FIXTURE.purchaserFirstName,
      readingName: PREVIEW_FIXTURE.readingName,
      readingPriceDisplay: PREVIEW_FIXTURE.readingPriceDisplay,
      giftMessage: PREVIEW_FIXTURE.giftMessage,
    };
    const legacyCopy = {
      ...EMAIL_GIFT_CLAIM_DEFAULTS,
      body: undefined,
    };
    const stringRender = await render(
      <GiftClaimEmail vars={vars} copy={legacyCopy} />,
    );
    const ptRender = await render(
      <GiftClaimEmail
        vars={vars}
        copy={{
          ...legacyCopy,
          bodyFirstSend: pt(EMAIL_GIFT_CLAIM_DEFAULTS.bodyFirstSend as string),
          claimUrlHelper: pt(EMAIL_GIFT_CLAIM_DEFAULTS.claimUrlHelper as string),
        }}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });

  it("PrivacyExport — legacy string vs PT array produce identical HTML", async () => {
    const vars = {
      downloadUrl: PREVIEW_FIXTURE.downloadUrl,
      submissionCount: PREVIEW_FIXTURE.submissionCount,
      expiryDays: PREVIEW_FIXTURE.expiryDays,
    };
    const legacyCopy = {
      ...EMAIL_PRIVACY_EXPORT_DEFAULTS,
      bodyIntro: undefined,
      bodyPostButton: undefined,
    };
    const stringRender = await render(<PrivacyExport vars={vars} copy={legacyCopy} />);
    const ptRender = await render(
      <PrivacyExport
        vars={vars}
        copy={{
          ...legacyCopy,
          introLine: pt(EMAIL_PRIVACY_EXPORT_DEFAULTS.introLine as string),
          contentsLine: pt(EMAIL_PRIVACY_EXPORT_DEFAULTS.contentsLine as string),
          expiryLine: pt(EMAIL_PRIVACY_EXPORT_DEFAULTS.expiryLine as string),
        }}
      />,
    );
    expect(stripWhitespace(ptRender)).toBe(stripWhitespace(stringRender));
  });
});
