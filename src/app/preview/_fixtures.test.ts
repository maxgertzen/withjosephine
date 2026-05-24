import { describe, expect, it } from "vitest";

import {
  LISTEN_PREVIEW_STATES,
  MY_GIFTS_PREVIEW_STATES,
  MY_READINGS_PREVIEW_STATES,
  parseListenState,
  parseMyGiftsState,
  parseMyReadingsState,
  PREVIEW_GIFTS_MIX,
  PREVIEW_READINGS_MIX,
} from "./_fixtures";

describe("preview fixtures", () => {
  describe("state parsers", () => {
    it("parseListenState falls back to 'delivered' for unknown input", () => {
      expect(parseListenState(undefined)).toBe("delivered");
      expect(parseListenState("nonsense")).toBe("delivered");
    });

    it("parseListenState accepts every known listen state", () => {
      for (const state of LISTEN_PREVIEW_STATES) {
        expect(parseListenState(state)).toBe(state);
      }
    });

    it("parseMyReadingsState falls back to 'list' for unknown input", () => {
      expect(parseMyReadingsState(undefined)).toBe("list");
      expect(parseMyReadingsState("nonsense")).toBe("list");
    });

    it("parseMyReadingsState accepts every known my-readings state", () => {
      for (const state of MY_READINGS_PREVIEW_STATES) {
        expect(parseMyReadingsState(state)).toBe(state);
      }
    });

    it("parseMyGiftsState falls back to 'list' for unknown input", () => {
      expect(parseMyGiftsState(undefined)).toBe("list");
      expect(parseMyGiftsState("nonsense")).toBe("list");
    });

    it("parseMyGiftsState accepts every known my-gifts state", () => {
      for (const state of MY_GIFTS_PREVIEW_STATES) {
        expect(parseMyGiftsState(state)).toBe(state);
      }
    });
  });

  describe("fixture mixes", () => {
    it("readings mix includes a delivered AND an expired row", () => {
      expect(PREVIEW_READINGS_MIX.length).toBeGreaterThanOrEqual(2);
      const deliveredAts = PREVIEW_READINGS_MIX.map((s) =>
        s.deliveredAt ? Date.parse(s.deliveredAt) : 0,
      );
      const now = Date.now();
      const ninety = 90 * 24 * 60 * 60 * 1000;
      expect(deliveredAts.some((d) => now - d < ninety)).toBe(true);
      expect(deliveredAts.some((d) => now - d > ninety)).toBe(true);
    });

    it("gifts mix includes self-send + scheduled + claimed variants", () => {
      const methods = new Set(PREVIEW_GIFTS_MIX.map((g) => g.giftDeliveryMethod));
      expect(methods.has("self_send")).toBe(true);
      expect(methods.has("scheduled")).toBe(true);
      const claimed = PREVIEW_GIFTS_MIX.find((g) => g.giftClaimedAt);
      expect(claimed).toBeTruthy();
    });

    it("every fixture submission has a reading attached", () => {
      for (const row of [...PREVIEW_READINGS_MIX, ...PREVIEW_GIFTS_MIX]) {
        expect(row.reading).toBeTruthy();
      }
    });
  });
});
