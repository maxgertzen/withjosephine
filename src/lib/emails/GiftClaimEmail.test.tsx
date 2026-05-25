import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_CLAIM_DEFAULTS } from "@/data/defaults";

import { GiftClaimEmail } from "./GiftClaimEmail";
import { stringToPortableTextBlocks } from "./PortableTextBody";
import { visibleText } from "./test-helpers";

const VARS = {
  recipientName: "Mira",
  purchaserFirstName: "Lior",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  giftMessage: "happy birthday",
  claimUrl: "https://withjosephine.com/gift/claim?token=abc123",
};

describe("GiftClaimEmail — first-send variant", () => {
  it("renders the recipient + purchaser names", async () => {
    const text = visibleText(
      await render(<GiftClaimEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />),
    );
    expect(text).toContain("Mira");
    expect(text).toContain("Lior");
  });

  it("includes the claim URL + CTA label", async () => {
    const html = await render(
      <GiftClaimEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />,
    );
    expect(html).toContain("https://withjosephine.com/gift/claim?token=abc123");
    expect(html).toContain(EMAIL_GIFT_CLAIM_DEFAULTS.claimButtonLabel);
  });

  it("renders the gift message when present", async () => {
    const text = visibleText(
      await render(<GiftClaimEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />),
    );
    expect(text).toContain("happy birthday");
  });

  it("escapes raw <script> in giftMessage", async () => {
    const html = await render(
      <GiftClaimEmail
        vars={{ ...VARS, giftMessage: "<script>alert(1)</script>" }}
        copy={EMAIL_GIFT_CLAIM_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders the staging origin verbatim when supplied (no hardcoded prod URL)", async () => {
    const html = await render(
      <GiftClaimEmail
        vars={{
          ...VARS,
          claimUrl: "https://staging.withjosephine.com/gift/claim?token=stagingABC",
        }}
        copy={EMAIL_GIFT_CLAIM_DEFAULTS}
      />,
    );
    expect(html).toContain("staging.withjosephine.com/gift/claim?token=stagingABC");
  });

  it("interpolates the {purchaserFirstName} slot in body copy", async () => {
    const text = visibleText(
      await render(
        <GiftClaimEmail
          vars={{ ...VARS, purchaserFirstName: "Yoram" }}
          copy={{
            ...EMAIL_GIFT_CLAIM_DEFAULTS,
            body: stringToPortableTextBlocks(
              "A note from {purchaserFirstName} — your reading awaits.",
            ),
          }}
        />,
      ),
    );
    expect(text).toContain("A note from Yoram");
    expect(text).not.toContain("{purchaserFirstName}");
  });

  it("renders the new body PT path when copy.body has content", async () => {
    const text = visibleText(
      await render(<GiftClaimEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />),
    );
    expect(text).toContain("Lior has given you a Soul Blueprint");
  });

  it("falls back to legacy bodyFirstSend when body is empty", async () => {
    const text = visibleText(
      await render(
        <GiftClaimEmail
          vars={VARS}
          copy={{
            ...EMAIL_GIFT_CLAIM_DEFAULTS,
            body: undefined,
            greeting: "Hi Mira,",
            bodyFirstSend: stringToPortableTextBlocks(
              "Legacy first-send prose for {recipientName}.",
            ),
          }}
        />,
      ),
    );
    expect(text).toContain("Hi Mira,");
    expect(text).toContain("Legacy first-send prose for Mira.");
  });
});
