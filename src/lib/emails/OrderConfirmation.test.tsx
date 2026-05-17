import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_ORDER_CONFIRMATION_DEFAULTS } from "@/data/defaults";

import { OrderConfirmation } from "./OrderConfirmation";
import { assertBrandTokens, linkHrefs, visibleText } from "./test-helpers";

const VARS = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$129",
  amountPaidDisplay: "$129.00" as string | null,
};

const HEADER_LINES = ["Josephine", "Soul Readings", "Your reading is booked"] as const;

const BODY_LINES = [
  "Hi Ada,",
  "Thank you for booking a Soul Blueprint with me",
  "I’ll begin your reading in the next day or two",
  "If anything comes up before then",
] as const;

const PRICE_CARD_LINES = ["Your reading", "Soul Blueprint", "Delivery within 7 days"] as const;

const FOOTER_LINES = [
  "hello@withjosephine.com",
  "withjosephine.com",
  "Readings are offered for entertainment and personal reflection.",
] as const;

const SIGNATURE_LINES = ["With love,", "Josephine ✦"] as const;

describe("OrderConfirmation — visual parity with locked copy", () => {
  it("renders header lines from Sanity-driven copy", async () => {
    const text = visibleText(
      await render(<OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />),
    );
    for (const line of HEADER_LINES) expect(text).toContain(line);
  });

  it("renders body paragraphs after firstName/readingName templating", async () => {
    const text = visibleText(
      await render(<OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />),
    );
    for (const line of BODY_LINES) expect(text).toContain(line);
  });

  it("renders the inset price card with amountPaidDisplay when set", async () => {
    const text = visibleText(
      await render(<OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />),
    );
    for (const line of PRICE_CARD_LINES) expect(text).toContain(line);
    expect(text).toContain("$129.00");
  });

  it("falls back to readingPriceDisplay when amountPaidDisplay is null", async () => {
    const text = visibleText(
      await render(
        <OrderConfirmation
          vars={{ ...VARS, amountPaidDisplay: null }}
          copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("$129");
  });

  it("renders the Sanity-driven signature block", async () => {
    const text = visibleText(
      await render(<OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />),
    );
    for (const line of SIGNATURE_LINES) expect(text).toContain(line);
  });

  it("renders the Sanity-driven footer copy", async () => {
    const text = visibleText(
      await render(<OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />),
    );
    for (const line of FOOTER_LINES) expect(text).toContain(line);
  });

  it("emits the mailto + site links", async () => {
    const hrefs = linkHrefs(
      await render(<OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />),
    );
    expect(hrefs.has("mailto:hello@withjosephine.com")).toBe(true);
    expect(hrefs.has("https://withjosephine.com")).toBe(true);
  });

  it("uses the brand serif family + cream + warm + ink + gold tokens", async () => {
    const html = await render(
      <OrderConfirmation vars={VARS} copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS} />,
    );
    expect(() =>
      assertBrandTokens(html, { serif: true, cream: true, warm: true, ink: true, gold: true }),
    ).not.toThrow();
  });

  it("escapes HTML in firstName via templating", async () => {
    const html = await render(
      <OrderConfirmation
        vars={{ ...VARS, firstName: "<script>x</script>" }}
        copy={EMAIL_ORDER_CONFIRMATION_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});
