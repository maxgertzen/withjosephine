import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_CLAIM_DEFAULTS } from "@/data/defaults";

import { GiftClaimEmail } from "./GiftClaimEmail";
import { visibleText } from "./test-helpers";

const FIRST_SEND_VARS = {
  recipientName: "Mira",
  purchaserFirstName: "Lior",
  readingName: "Soul Blueprint",
  giftMessage: "happy birthday",
  variant: "first_send" as const,
  claimUrl: "https://withjosephine.com/gift/claim?token=abc123",
};

const REMINDER_VARS = {
  recipientName: "Mira",
  purchaserFirstName: "Lior",
  readingName: "Soul Blueprint",
  giftMessage: null,
  variant: "reminder" as const,
};

describe("GiftClaimEmail — first_send variant", () => {
  it("renders the recipient + purchaser names", async () => {
    const text = visibleText(
      await render(<GiftClaimEmail vars={FIRST_SEND_VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />),
    );
    expect(text).toContain("Mira");
    expect(text).toContain("Lior");
  });

  it("includes the claim URL + CTA label", async () => {
    const html = await render(
      <GiftClaimEmail vars={FIRST_SEND_VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />,
    );
    expect(html).toContain("https://withjosephine.com/gift/claim?token=abc123");
    expect(html).toContain(EMAIL_GIFT_CLAIM_DEFAULTS.claimButtonLabel);
  });

  it("renders the gift message when present", async () => {
    const text = visibleText(
      await render(<GiftClaimEmail vars={FIRST_SEND_VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />),
    );
    expect(text).toContain("happy birthday");
  });

  it("escapes raw <script> in giftMessage", async () => {
    const html = await render(
      <GiftClaimEmail
        vars={{ ...FIRST_SEND_VARS, giftMessage: "<script>alert(1)</script>" }}
        copy={EMAIL_GIFT_CLAIM_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("GiftClaimEmail — reminder variant", () => {
  it("does NOT include a claim URL", async () => {
    const html = await render(
      <GiftClaimEmail vars={REMINDER_VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />,
    );
    expect(html).not.toContain("/gift/claim?token=");
  });

  it("renders the reminder contact line", async () => {
    const text = visibleText(
      await render(<GiftClaimEmail vars={REMINDER_VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />),
    );
    expect(text).toContain("hello@withjosephine.com");
  });

  it("does NOT include the claim button label", async () => {
    const html = await render(
      <GiftClaimEmail vars={REMINDER_VARS} copy={EMAIL_GIFT_CLAIM_DEFAULTS} />,
    );
    expect(html).not.toContain(EMAIL_GIFT_CLAIM_DEFAULTS.claimButtonLabel);
  });
});
