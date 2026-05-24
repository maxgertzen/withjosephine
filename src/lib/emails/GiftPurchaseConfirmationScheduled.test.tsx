import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS } from "@/data/defaults";

import { GiftPurchaseConfirmationScheduled } from "./GiftPurchaseConfirmationScheduled";
import { visibleText } from "./test-helpers";

const VARS = {
  purchaserFirstName: "Alice",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179.00" as string | null,
  recipientName: "Bob",
  giftMessage: null,
  myGiftsUrl: "https://withjosephine.com/my-gifts",
  sendAtDisplay: "Tuesday, May 19 at 9:00 AM",
};

describe("GiftPurchaseConfirmationScheduled", () => {
  it("renders the sendAtDisplay verbatim", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationScheduled
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Tuesday, May 19 at 9:00 AM");
  });

  it("does NOT include a shareable claim URL", async () => {
    const html = await render(
      <GiftPurchaseConfirmationScheduled
        vars={VARS}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS}
      />,
    );
    expect(html).not.toContain("/gift/claim?token=");
  });

  it("renders the recipient name", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationScheduled
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Bob");
  });

  it("does NOT promise a refund", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationScheduled
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS}
        />,
      ),
    );
    expect(text.toLowerCase()).not.toContain("arrange a full refund");
    expect(text).toMatch(/non-refundable once payment is complete/i);
    expect(text.toLowerCase()).toContain("withjosephine.com/my-gifts");
  });

  it("renders the new body PT path when copy.body has content", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationScheduled
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Thank you for gifting a Soul Blueprint");
  });

  it("falls back to legacy detailLineScheduled when body is empty", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationScheduled
          vars={VARS}
          copy={{
            ...EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS,
            body: undefined,
            greeting: "Hi Alice,",
            detailLineScheduled: "Legacy fallback for {recipientName} on {sendAtDisplay}.",
          }}
        />,
      ),
    );
    expect(text).toContain("Hi Alice,");
    expect(text).toContain("Legacy fallback for Bob on Tuesday, May 19 at 9:00 AM");
  });
});
