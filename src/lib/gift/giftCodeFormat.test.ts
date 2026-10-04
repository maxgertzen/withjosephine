import { describe, expect, it } from "vitest";

import {
  formatGiftCode,
  giftPath,
  giftSendPath,
  normalizeGiftCode,
  parseGiftSendFragment,
} from "./giftCodeFormat";

describe("normalizeGiftCode", () => {
  it("strips spaces and dashes and uppercases", () => {
    expect(normalizeGiftCode("k7m2 qx9p-h4tr")).toBe("K7M2QX9PH4TR");
  });

  it("reads O as 0 and I and L as 1", () => {
    expect(normalizeGiftCode("O7M2-QX9P-H4TR")).toBe("07M2QX9PH4TR");
    expect(normalizeGiftCode("I7M2-QX9P-H4TL")).toBe("17M2QX9PH4T1");
    expect(normalizeGiftCode("i7m2-qx9p-h4tl")).toBe("17M2QX9PH4T1");
  });

  it("rejects U, which is not in the alphabet", () => {
    expect(normalizeGiftCode("U7M2QX9PH4TR")).toBeNull();
  });

  it("rejects 11 and 13 characters", () => {
    expect(normalizeGiftCode("K7M2QX9PH4T")).toBeNull();
    expect(normalizeGiftCode("K7M2QX9PH4TRA")).toBeNull();
  });

  it("rejects the preview placeholder", () => {
    expect(normalizeGiftCode("PREVIEW-GIFT")).toBeNull();
  });
});

describe("gift code display and paths", () => {
  it("formats the display form in groups of four", () => {
    expect(formatGiftCode("K7M2QX9PH4TR")).toBe("K7M2-QX9P-H4TR");
  });

  it("builds the gift page path", () => {
    expect(giftPath("K7M2QX9PH4TR")).toBe("/gift/K7M2QX9PH4TR");
  });

  it("puts the send token in the fragment", () => {
    expect(giftSendPath("abc.def")).toBe("/gift/send#abc.def");
  });
});

describe("parseGiftSendFragment", () => {
  it("round-trips giftSendPath", () => {
    const token = "00000000-0000-4000-8000-000000000001.OwU0AOlEDqLGVapBH2VdxkO3IP8JCngREk8yoW6XZQI";
    const hash = new URL(giftSendPath(token), "https://withjosephine.com").hash;
    expect(parseGiftSendFragment(hash)).toBe(token);
  });

  it("returns null for an empty hash", () => {
    expect(parseGiftSendFragment("")).toBeNull();
    expect(parseGiftSendFragment("#")).toBeNull();
  });
});
