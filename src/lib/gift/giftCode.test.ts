import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deriveGiftCode,
  deriveGiftSendToken,
  deriveVerifiedGiftCode,
  giftLookupHash,
  verifyGiftSendToken,
} from "./giftCode";
import { formatGiftCode } from "./giftCodeFormat";

const GOLDEN_SECRET = "golden-gift-code-secret";
const GOLDEN_GIFT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_GIFT_ID = "00000000-0000-4000-8000-000000000002";
const GOLDEN_CODE = "Y9EBDP599AM2";
const GOLDEN_LOOKUP_HASH = "6cdcc30e5a77b073295b0b0826e26809ea39f3c59e6b88f98a675f52bbba9270";
const GOLDEN_SEND_TOKEN = `${GOLDEN_GIFT_ID}.OwU0AOlEDqLGVapBH2VdxkO3IP8JCngREk8yoW6XZQI`;

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", GOLDEN_SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("golden values", () => {
  it("derives the code", async () => {
    expect(await deriveGiftCode(GOLDEN_GIFT_ID)).toBe(GOLDEN_CODE);
  });

  it("formats the code", async () => {
    expect(formatGiftCode(await deriveGiftCode(GOLDEN_GIFT_ID))).toBe("Y9EB-DP59-9AM2");
  });

  it("hashes the normalized code", async () => {
    expect(await giftLookupHash(GOLDEN_CODE)).toBe(GOLDEN_LOOKUP_HASH);
  });

  it("derives the send token", async () => {
    expect(await deriveGiftSendToken(GOLDEN_GIFT_ID)).toBe(GOLDEN_SEND_TOKEN);
  });
});

describe("verifyGiftSendToken", () => {
  const [, goldenMac] = GOLDEN_SEND_TOKEN.split(".");

  it("returns the gift id for the derived token", async () => {
    expect(await verifyGiftSendToken(GOLDEN_SEND_TOKEN)).toBe(GOLDEN_GIFT_ID);
  });

  it("rejects another gift id carrying the same MAC", async () => {
    expect(await verifyGiftSendToken(`${OTHER_GIFT_ID}.${goldenMac}`)).toBeNull();
  });

  it("rejects a changed MAC character", async () => {
    const changedFirst = goldenMac[0] === "A" ? "B" : "A";
    expect(
      await verifyGiftSendToken(`${GOLDEN_GIFT_ID}.${changedFirst}${goldenMac.slice(1)}`),
    ).toBeNull();
  });

  it("rejects a token without a dot", async () => {
    expect(await verifyGiftSendToken(`${GOLDEN_GIFT_ID}${goldenMac}`)).toBeNull();
  });

  it("rejects a token with three parts", async () => {
    expect(await verifyGiftSendToken(`${GOLDEN_SEND_TOKEN}.extra`)).toBeNull();
  });

  it("rejects a gift id that is not a UUID", async () => {
    expect(await verifyGiftSendToken(`gift_1.${goldenMac}`)).toBeNull();
  });

  it("rejects a MAC that is not base64url", async () => {
    expect(await verifyGiftSendToken(`${GOLDEN_GIFT_ID}.!!!not*base64`)).toBeNull();
  });
});

describe("deriveVerifiedGiftCode", () => {
  it("returns the code when the lookup hash matches", async () => {
    expect(
      await deriveVerifiedGiftCode({ id: GOLDEN_GIFT_ID, lookupHash: GOLDEN_LOOKUP_HASH }),
    ).toBe(GOLDEN_CODE);
  });

  it("returns null and logs the gift id when the lookup hash does not match", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await deriveVerifiedGiftCode({ id: GOLDEN_GIFT_ID, lookupHash: "0".repeat(64) }),
    ).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(GOLDEN_GIFT_ID));
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining(GOLDEN_CODE));
  });
});

describe("without GIFT_CODE_SECRET", () => {
  beforeEach(() => {
    vi.stubEnv("GIFT_CODE_SECRET", "");
  });

  it("rejects every signing function", async () => {
    await expect(deriveGiftCode(GOLDEN_GIFT_ID)).rejects.toThrow("GIFT_CODE_SECRET");
    await expect(giftLookupHash(GOLDEN_CODE)).rejects.toThrow("GIFT_CODE_SECRET");
    await expect(deriveGiftSendToken(GOLDEN_GIFT_ID)).rejects.toThrow("GIFT_CODE_SECRET");
    await expect(verifyGiftSendToken(GOLDEN_SEND_TOKEN)).rejects.toThrow("GIFT_CODE_SECRET");
    await expect(
      deriveVerifiedGiftCode({ id: GOLDEN_GIFT_ID, lookupHash: GOLDEN_LOOKUP_HASH }),
    ).rejects.toThrow("GIFT_CODE_SECRET");
  });
});
