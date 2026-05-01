import { describe, expect, it } from "vitest";

import { formatAmountPaid } from "./formatAmount";

describe("formatAmountPaid", () => {
  it("formats USD cents into the en-US currency style", () => {
    expect(formatAmountPaid(9900, "usd")).toBe("$99.00");
    expect(formatAmountPaid(12900, "usd")).toBe("$129.00");
  });

  it("uppercases lowercase currency codes from Stripe", () => {
    expect(formatAmountPaid(9900, "USD")).toBe("$99.00");
    expect(formatAmountPaid(9900, "usd")).toBe("$99.00");
  });

  it("defaults to USD when currency is missing", () => {
    expect(formatAmountPaid(9900, undefined)).toBe("$99.00");
    expect(formatAmountPaid(9900, null)).toBe("$99.00");
  });

  it("returns null when cents is null or undefined", () => {
    expect(formatAmountPaid(null, "usd")).toBeNull();
    expect(formatAmountPaid(undefined, "usd")).toBeNull();
  });

  it("handles zero cents (100% discount)", () => {
    expect(formatAmountPaid(0, "usd")).toBe("$0.00");
  });

  it("falls back to plain number + code when currency is malformed", () => {
    expect(formatAmountPaid(9900, "not-a-code")).toBe("99.00 NOT-A-CODE");
  });

  it("formats GBP correctly", () => {
    expect(formatAmountPaid(7900, "gbp")).toMatch(/79\.00/);
  });
});
