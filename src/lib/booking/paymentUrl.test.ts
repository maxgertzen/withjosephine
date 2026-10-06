import { describe, expect, it } from "vitest";

import { buildPaymentUrl, isStripePaymentLink } from "./paymentUrl";

const READING = { stripePaymentLink: "https://buy.stripe.com/test_abc" };

describe("buildPaymentUrl", () => {
  it("keeps prefilled_email on a booking call", () => {
    const url = new URL(buildPaymentUrl(READING, "sub_1", "ada@example.com") ?? "");
    expect(url.searchParams.get("client_reference_id")).toBe("sub_1");
    expect(url.searchParams.get("prefilled_email")).toBe("ada@example.com");
  });

  it("omits prefilled_email on a gift call", () => {
    const url = new URL(buildPaymentUrl(READING, "gift_abc") ?? "");
    expect(url.searchParams.get("client_reference_id")).toBe("gift_abc");
    expect(url.searchParams.has("prefilled_email")).toBe(false);
  });

  it.each([
    ["a non-Stripe host", "https://evil.example.com/pay"],
    ["plain http", "http://buy.stripe.com/test_abc"],
    ["an unparseable link", "not a url"],
    ["a missing link", undefined],
  ])("returns null for %s", (_label, stripePaymentLink) => {
    expect(buildPaymentUrl({ stripePaymentLink }, "sub_1", "ada@example.com")).toBeNull();
  });
});

describe("isStripePaymentLink", () => {
  it.each([
    ["an https Stripe link", "https://buy.stripe.com/test_abc", true],
    ["a non-Stripe host", "https://evil.example.com/pay", false],
    ["plain http", "http://buy.stripe.com/test_abc", false],
    ["an unparseable link", "not a url", false],
    ["a missing link", undefined, false],
  ])("checks %s", (_label, link, expected) => {
    expect(isStripePaymentLink(link)).toBe(expected);
  });
});
