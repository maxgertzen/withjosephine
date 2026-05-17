import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS } from "@/data/defaults";

import { GiftPurchaseConfirmation } from "./GiftPurchaseConfirmation";
import { visibleText } from "./test-helpers";

const SELF_SEND_VARS = {
  purchaserFirstName: "Alice",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179.00" as string | null,
  recipientName: "Bob",
  giftMessage: "happy birthday",
  variant: "self_send" as const,
  claimUrl: "https://withjosephine.com/gift/claim?token=abc123",
};

const SCHEDULED_VARS = {
  purchaserFirstName: "Alice",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179.00" as string | null,
  recipientName: "Bob",
  giftMessage: null,
  variant: "scheduled" as const,
  sendAtDisplay: "Tuesday, May 19 at 9:00 AM",
};

describe("GiftPurchaseConfirmation — self_send variant", () => {
  it("renders the purchaser first name", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={SELF_SEND_VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Alice");
  });

  it("includes the shareable claim URL", async () => {
    const html = await render(
      <GiftPurchaseConfirmation
        vars={SELF_SEND_VARS}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
      />,
    );
    expect(html).toContain("https://withjosephine.com/gift/claim?token=abc123");
  });

  it("does NOT include sendAtDisplay copy in self_send mode", async () => {
    const html = await render(
      <GiftPurchaseConfirmation
        vars={SELF_SEND_VARS}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
      />,
    );
    expect(html).not.toContain("Tuesday, May 19");
  });

  it("escapes HTML in purchaserFirstName via templating", async () => {
    const html = await render(
      <GiftPurchaseConfirmation
        vars={{ ...SELF_SEND_VARS, purchaserFirstName: "<script>x</script>" }}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<script>x</script>");
  });
});

describe("GiftPurchaseConfirmation — scheduled variant", () => {
  it("renders the sendAtDisplay verbatim", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={SCHEDULED_VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Tuesday, May 19 at 9:00 AM");
  });

  it("does NOT include a shareable claim URL", async () => {
    const html = await render(
      <GiftPurchaseConfirmation
        vars={SCHEDULED_VARS}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
      />,
    );
    expect(html).not.toContain("/gift/claim?token=");
  });

  it("renders the recipient name", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={SCHEDULED_VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Bob");
  });
});

describe("GiftPurchaseConfirmation — refund-policy honesty", () => {
  // Regression guard for Phase 5 Session 4 LB-2: the prior default `refundLine`
  // promised a full refund, contradicting the locked flat non-refundable policy.
  it("does NOT promise a refund in the self_send variant", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={SELF_SEND_VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text.toLowerCase()).not.toContain("arrange a full refund");
    expect(text).toMatch(/non-refundable once payment is complete/i);
    // Points at the purchaser's self-service surface, not "write to me".
    expect(text.toLowerCase()).toContain("withjosephine.com/my-gifts");
  });

  it("does NOT promise a refund in the scheduled variant", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={SCHEDULED_VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text.toLowerCase()).not.toContain("arrange a full refund");
    expect(text).toMatch(/non-refundable once payment is complete/i);
    expect(text.toLowerCase()).toContain("withjosephine.com/my-gifts");
  });
});
