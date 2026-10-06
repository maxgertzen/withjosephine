import { describe, expect, it } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";

import { giftContent } from "./giftContent";

describe("giftContent", () => {
  it("returns GIFT_DEFAULTS when Sanity has no document", () => {
    expect(giftContent(null)).toEqual(GIFT_DEFAULTS);
  });

  it("uses the Sanity value when one is set", () => {
    expect(giftContent({ sheetEyebrow: "A gift for you." }).sheetEyebrow).toBe("A gift for you.");
  });

  it("falls back to the default for a blank value", () => {
    expect(giftContent({ sheetCancelLabel: "   " }).sheetCancelLabel).toBe(
      GIFT_DEFAULTS.sheetCancelLabel,
    );
  });
});
