import { describe, expect, it } from "vitest";

import {
  EMAIL_ALLOWED_SLOTS,
  extractSlots,
  formatSlotValidationError,
  validateSlotsInValue,
} from "./slots";

describe("slots — extractSlots", () => {
  it("returns slot names without braces", () => {
    expect(extractSlots("Hi {firstName}, your {readingName} is ready.")).toEqual([
      "firstName",
      "readingName",
    ]);
  });
  it("returns empty array when no slots present", () => {
    expect(extractSlots("Hello world.")).toEqual([]);
  });
  it("ignores braces with non-identifier content", () => {
    expect(extractSlots("Use {1} not {firstName}.")).toEqual(["firstName"]);
  });
});

describe("slots — validateSlotsInValue (string fields)", () => {
  it("accepts strings using only allowed slots", () => {
    const result = validateSlotsInValue(
      "Hi {firstName}, your {readingName} is ready.",
      "emailOrderConfirmation",
    );
    expect(result).toEqual({ ok: true });
  });
  it("rejects strings with unknown slots", () => {
    const result = validateSlotsInValue("Hi {firstName}, your {totallyWrong}.", "emailOrderConfirmation");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.unknown).toEqual(["totallyWrong"]);
  });
  it("accepts undefined / null without complaint", () => {
    expect(validateSlotsInValue(undefined, "emailOrderConfirmation")).toEqual({ ok: true });
    expect(validateSlotsInValue(null, "emailOrderConfirmation")).toEqual({ ok: true });
  });
});

describe("slots — validateSlotsInValue (array-of-text fields)", () => {
  it("validates each entry in an array", () => {
    const result = validateSlotsInValue(
      ["Line one with {firstName}.", "Line two with {bogusToken}."],
      "emailOrderConfirmation",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.unknown).toEqual(["bogusToken"]);
  });
  it("returns ok when every entry uses allowed slots", () => {
    const result = validateSlotsInValue(
      ["Line {firstName}.", "Line {firstName} again."],
      "emailOrderConfirmation",
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("slots — formatSlotValidationError", () => {
  it("names the unknown slot and lists the allowed set", () => {
    const result = validateSlotsInValue(
      "Hi {firstName}, your {wrongSlot}.",
      "emailDay7Delivery",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const msg = formatSlotValidationError(result);
      expect(msg).toContain("{wrongSlot}");
      expect(msg).toContain("{firstName}");
      expect(msg).toContain("{readingName}");
    }
  });
});

describe("slots — EMAIL_ALLOWED_SLOTS", () => {
  it("covers every template referenced by code-side senders", () => {
    expect(Object.keys(EMAIL_ALLOWED_SLOTS).sort()).toEqual(
      [
        "emailDay7Delivery",
        "emailMagicLink",
        "emailOrderConfirmation",
        "emailPrivacyExport",
      ].sort(),
    );
  });

  it("makes readingPriceDisplay available in customer emails that have purchase context", () => {
    expect(EMAIL_ALLOWED_SLOTS.emailOrderConfirmation).toContain("readingPriceDisplay");
    expect(EMAIL_ALLOWED_SLOTS.emailDay7Delivery).toContain("readingPriceDisplay");
  });

  it("exposes URL tokens where the template's vars carry them", () => {
    expect(EMAIL_ALLOWED_SLOTS.emailDay7Delivery).toContain("listenUrl");
    expect(EMAIL_ALLOWED_SLOTS.emailPrivacyExport).toContain("downloadUrl");
  });

  it("exposes amountPaidDisplay where the template's vars carry it", () => {
    expect(EMAIL_ALLOWED_SLOTS.emailOrderConfirmation).toContain("amountPaidDisplay");
  });
});
