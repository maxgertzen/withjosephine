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
  myGiftsUrl: "https://withjosephine.com/my-gifts",
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
  myGiftsUrl: "https://withjosephine.com/my-gifts",
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

  it("replaces {recipientName} in shareUrlHelper with the actual name (B-7)", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={{ ...SELF_SEND_VARS, recipientName: "Laura" }}
          copy={{
            ...EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS,
            shareUrlHelper: "This link is for {recipientName}. Share it the way you'd give them a handwritten card.",
          }}
        />,
      ),
    );
    expect(text).toContain("This link is for Laura");
    expect(text).not.toContain("{recipientName}");
  });

  it("falls back to a generic word when recipientName is null (B-7)", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={{ ...SELF_SEND_VARS, recipientName: null }}
          copy={{
            ...EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS,
            shareUrlHelper: "This link is for {recipientName}. Share it however you like.",
          }}
        />,
      ),
    );
    expect(text).not.toContain("{recipientName}");
    expect(text).toContain("your recipient");
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

describe("GiftPurchaseConfirmation — environment-aware {myGiftsUrl} (C-7)", () => {
  it("renders the supplied myGiftsUrl verbatim in the refundLine (staging origin)", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={{
            ...SELF_SEND_VARS,
            myGiftsUrl: "https://staging.withjosephine.com/my-gifts",
          }}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("staging.withjosephine.com/my-gifts");
    expect(text).not.toContain("{myGiftsUrl}");
  });

  it("template helper does not leave {myGiftsUrl} placeholder un-substituted", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmation
          vars={SELF_SEND_VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text).not.toContain("{myGiftsUrl}");
  });
});
