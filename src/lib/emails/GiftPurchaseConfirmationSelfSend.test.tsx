import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS } from "@/data/defaults";

import { GiftPurchaseConfirmationSelfSend } from "./GiftPurchaseConfirmationSelfSend";
import { stringToPortableTextBlocks } from "./PortableTextBody";
import { visibleText } from "./test-helpers";

const VARS = {
  purchaserFirstName: "Alice",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  amountPaidDisplay: "$179.00" as string | null,
  recipientName: "Bob",
  giftMessage: "happy birthday",
  myGiftsUrl: "https://withjosephine.com/my-gifts",
  claimUrl: "https://withjosephine.com/gift/claim?token=abc123",
};

describe("GiftPurchaseConfirmationSelfSend", () => {
  it("renders the purchaser first name", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationSelfSend
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Alice");
  });

  it("includes the shareable claim URL", async () => {
    const html = await render(
      <GiftPurchaseConfirmationSelfSend
        vars={VARS}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
      />,
    );
    expect(html).toContain("https://withjosephine.com/gift/claim?token=abc123");
  });

  it("escapes HTML in purchaserFirstName via templating", async () => {
    const html = await render(
      <GiftPurchaseConfirmationSelfSend
        vars={{ ...VARS, purchaserFirstName: "<script>x</script>" }}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<script>x</script>");
  });

  it("replaces {recipientName} in shareUrlHelper with the actual name", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationSelfSend
          vars={{ ...VARS, recipientName: "Laura" }}
          copy={{
            ...EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
            shareUrlHelper: stringToPortableTextBlocks(
              "This link is for {recipientName}. Share it the way you'd give them a handwritten card.",
            ),
          }}
        />,
      ),
    );
    expect(text).toContain("This link is for Laura");
    expect(text).not.toContain("{recipientName}");
  });

  it("falls back to a generic word when recipientName is null", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationSelfSend
          vars={{ ...VARS, recipientName: null }}
          copy={{
            ...EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
            shareUrlHelper: stringToPortableTextBlocks(
              "This link is for {recipientName}. Share it however you like.",
            ),
          }}
        />,
      ),
    );
    expect(text).not.toContain("{recipientName}");
    expect(text).toContain("your recipient");
  });

  // Regression guard for Phase 5 Session 4 LB-2: the prior default `refundLine`
  // promised a full refund, contradicting the locked flat non-refundable policy.
  it("does NOT promise a refund", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationSelfSend
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
        />,
      ),
    );
    expect(text.toLowerCase()).not.toContain("arrange a full refund");
    expect(text).toMatch(/non-refundable once payment is complete/i);
    expect(text.toLowerCase()).toContain("withjosephine.com/my-gifts");
  });

  it("renders the supplied myGiftsUrl verbatim in the refundLine (staging origin)", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationSelfSend
          vars={{
            ...VARS,
            myGiftsUrl: "https://staging.withjosephine.com/my-gifts",
          }}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("staging.withjosephine.com/my-gifts");
    expect(text).not.toContain("{myGiftsUrl}");
  });

  it("renders the new body PT path when copy.body has content", async () => {
    const text = visibleText(
      await render(
        <GiftPurchaseConfirmationSelfSend
          vars={VARS}
          copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Thank you for gifting a Soul Blueprint");
  });

  it("renders the secondary library button when libraryUrl is provided", async () => {
    const libraryUrl =
      "https://withjosephine.com/my-readings/welcome?t=fakeToken.signedSig";
    const html = await render(
      <GiftPurchaseConfirmationSelfSend
        vars={{ ...VARS, libraryUrl }}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
      />,
    );
    expect(html).toContain(libraryUrl);
    expect(visibleText(html)).toContain("See all your readings");
  });

  it("does NOT render the library button when libraryUrl is absent", async () => {
    const html = await render(
      <GiftPurchaseConfirmationSelfSend
        vars={VARS}
        copy={EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS}
      />,
    );
    expect(visibleText(html)).not.toContain("See all your readings");
    expect(html).not.toContain("/my-readings/welcome");
  });
});
