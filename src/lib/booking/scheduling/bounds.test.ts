import { describe, expect, it } from "vitest";

import {
  SEND_AT_BOUND_CODE,
  SEND_AT_MAX_DAYS,
  SEND_AT_MIN_OFFSET_MS,
  validateSendAtBounds,
} from "./bounds";

const NOW = new Date("2026-05-19T12:00:00.000Z");
const PURCHASED_AT = new Date("2026-05-19T11:00:00.000Z");

describe("validateSendAtBounds", () => {
  it("returns ok with normalised ISO when within bounds", () => {
    const sendAt = new Date(NOW.getTime() + SEND_AT_MIN_OFFSET_MS + 60_000).toISOString();
    const result = validateSendAtBounds(sendAt, { now: NOW, purchasedAt: PURCHASED_AT });
    expect(result).toEqual({ ok: true, sendAtIso: sendAt });
  });

  it("rejects unparseable dates as invalid", () => {
    const result = validateSendAtBounds("not-a-date", { now: NOW, purchasedAt: PURCHASED_AT });
    expect(result).toEqual({ ok: false, code: SEND_AT_BOUND_CODE.invalid });
  });

  it("rejects send-at less than 15 minutes from now as too_soon", () => {
    const fourteenMin = new Date(NOW.getTime() + 14 * 60 * 1000).toISOString();
    const result = validateSendAtBounds(fourteenMin, { now: NOW, purchasedAt: PURCHASED_AT });
    expect(result).toEqual({ ok: false, code: SEND_AT_BOUND_CODE.tooSoon });
  });

  it("accepts send-at exactly 15 minutes from now (inclusive lower bound)", () => {
    const fifteen = new Date(NOW.getTime() + SEND_AT_MIN_OFFSET_MS).toISOString();
    const result = validateSendAtBounds(fifteen, { now: NOW, purchasedAt: PURCHASED_AT });
    expect(result.ok).toBe(true);
  });

  it("rejects send-at more than 365 days past purchase as too_far", () => {
    const oneYearOneSec = new Date(PURCHASED_AT);
    oneYearOneSec.setUTCDate(oneYearOneSec.getUTCDate() + SEND_AT_MAX_DAYS);
    oneYearOneSec.setUTCSeconds(oneYearOneSec.getUTCSeconds() + 1);
    const result = validateSendAtBounds(oneYearOneSec.toISOString(), {
      now: NOW,
      purchasedAt: PURCHASED_AT,
    });
    expect(result).toEqual({ ok: false, code: SEND_AT_BOUND_CODE.tooFar });
  });

  it("anchors the ceiling to purchasedAt, not now (no drift on edits)", () => {
    const laterNow = new Date(PURCHASED_AT);
    laterNow.setUTCDate(laterNow.getUTCDate() + 100);
    const targetAtMaxFromPurchase = new Date(PURCHASED_AT);
    targetAtMaxFromPurchase.setUTCDate(
      targetAtMaxFromPurchase.getUTCDate() + SEND_AT_MAX_DAYS,
    );
    const result = validateSendAtBounds(targetAtMaxFromPurchase.toISOString(), {
      now: laterNow,
      purchasedAt: PURCHASED_AT,
    });
    expect(result.ok).toBe(true);
  });
});
