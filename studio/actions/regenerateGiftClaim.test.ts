import { describe, expect, it } from "vitest";

import { isVisibleForDocument } from "./regenerateGiftClaim";

describe("regenerateGiftClaim — isVisibleForDocument", () => {
  it("is visible for a live gift (isGift true, not claimed, not cancelled)", () => {
    expect(
      isVisibleForDocument({ isGift: true, giftClaimedAt: null, giftCancelledAt: null }),
    ).toBe(true);
  });

  it("is hidden when the submission is not a gift", () => {
    expect(
      isVisibleForDocument({ isGift: false, giftClaimedAt: null, giftCancelledAt: null }),
    ).toBe(false);
  });

  it("is hidden once the gift has been claimed", () => {
    expect(
      isVisibleForDocument({
        isGift: true,
        giftClaimedAt: "2026-05-12T12:00:00.000Z",
        giftCancelledAt: null,
      }),
    ).toBe(false);
  });

  it("is hidden once the gift has been cancelled", () => {
    expect(
      isVisibleForDocument({
        isGift: true,
        giftClaimedAt: null,
        giftCancelledAt: "2026-05-12T12:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("is hidden when document state is null (Studio bootstrap)", () => {
    expect(isVisibleForDocument(null)).toBe(false);
  });

  it("is hidden when isGift is undefined (legacy / non-gift schema)", () => {
    expect(isVisibleForDocument({})).toBe(false);
  });
});
