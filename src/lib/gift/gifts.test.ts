import { describe, expect, it } from "vitest";

import { makeGiftRecord } from "@/test/fixtures/gift";

import { resolveGiftState } from "./gifts";
import { GIFT_STATUS, type GiftState, type GiftStatus } from "./types";

describe("resolveGiftState", () => {
  it.each<[GiftStatus, GiftState]>([
    [GIFT_STATUS.pending, "not_found"],
    [GIFT_STATUS.expired, "not_found"],
    [GIFT_STATUS.active, "active"],
    [GIFT_STATUS.redeemed, "redeemed"],
    [GIFT_STATUS.cancelled, "not_active"],
  ])("maps %s to %s", (status, state) => {
    expect(resolveGiftState(makeGiftRecord({ status }))).toBe(state);
  });

  it("maps a missing gift to not_found", () => {
    expect(resolveGiftState(null)).toBe("not_found");
  });
});
