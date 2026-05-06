import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { OrderConfirmation } from "./OrderConfirmation";
import { linkHrefs, visibleText } from "./test-helpers";

const PROPS = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$129",
  amountPaidDisplay: "$129.00",
};

const LEGACY_HEADER_LINES = [
  "Josephine",
  "Soul Readings",
  "Your reading is booked",
] as const;

const LEGACY_BODY_LINES = [
  "Hi Ada,",
  "Thank you for booking a Soul Blueprint with me. I have your intake and your payment, and you don't need to do anything else.",
  "I'll begin your reading in the next day or two. You'll hear a short note from me when I do, just so you know it's underway. Your voice note and PDF will arrive within seven days, to this email address.",
  "If anything comes up before then — a question, a detail you forgot to mention, anything at all — just reply to this email. It comes straight to me.",
] as const;

const LEGACY_PRICE_CARD_LINES = [
  "Your reading",
  "Soul Blueprint",
  "Delivery within 7 days",
] as const;

const LEGACY_FOOTER_LINES = [
  "hello@withjosephine.com",
  "withjosephine.com",
  "Readings are offered for entertainment and personal reflection.",
] as const;

const LEGACY_SIGNATURE_LINES = [
  "With love,",
  "Josephine ✦",
] as const;

describe("OrderConfirmation — visual parity with legacy resend.tsx", () => {
  it("renders header lines", async () => {
    const text = visibleText(await render(<OrderConfirmation {...PROPS} />));
    for (const line of LEGACY_HEADER_LINES) expect(text).toContain(line);
  });

  it("renders body paragraphs verbatim", async () => {
    const text = visibleText(await render(<OrderConfirmation {...PROPS} />));
    for (const line of LEGACY_BODY_LINES) expect(text).toContain(line);
  });

  it("renders the inset price card with amountPaidDisplay when set", async () => {
    const text = visibleText(await render(<OrderConfirmation {...PROPS} />));
    for (const line of LEGACY_PRICE_CARD_LINES) expect(text).toContain(line);
    expect(text).toContain("$129.00");
  });

  it("falls back to readingPriceDisplay when amountPaidDisplay is null", async () => {
    const text = visibleText(
      await render(<OrderConfirmation {...PROPS} amountPaidDisplay={null} />),
    );
    expect(text).toContain("$129");
  });

  it("renders the signature block", async () => {
    const text = visibleText(await render(<OrderConfirmation {...PROPS} />));
    for (const line of LEGACY_SIGNATURE_LINES) expect(text).toContain(line);
  });

  it("renders the footer copy", async () => {
    const text = visibleText(await render(<OrderConfirmation {...PROPS} />));
    for (const line of LEGACY_FOOTER_LINES) expect(text).toContain(line);
  });

  it("emits the mailto + site links", async () => {
    const hrefs = linkHrefs(await render(<OrderConfirmation {...PROPS} />));
    expect(hrefs.has("mailto:hello@withjosephine.com")).toBe(true);
    expect(hrefs.has("https://withjosephine.com")).toBe(true);
  });

  it("uses the brand serif family + cream + warm + ink + gold tokens", async () => {
    const html = (await render(<OrderConfirmation {...PROPS} />)).toLowerCase();
    expect(html).toMatch(/cormorant garamond/);
    expect(html).toContain("#faf8f4"); // cream
    expect(html).toContain("#f5f0e8"); // warm
    expect(html).toContain("#1c1935"); // ink
    expect(html).toContain("#c4a46b"); // gold
  });

  it("escapes HTML in firstName", async () => {
    const html = await render(<OrderConfirmation {...PROPS} firstName="<script>x</script>" />);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});
