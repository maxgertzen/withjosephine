import { describe, expect, it } from "vitest";

import { pageGroups } from "./previewPageGroups";

const NO_DOCS = { readings: [], notes: [], legal: [] };

describe("pageGroups", () => {
  it("lists every gift preview state under Gift pages", () => {
    const giftGroup = pageGroups(NO_DOCS).find((group) => group.title === "Gift pages");

    expect(giftGroup?.pages).toEqual([
      { title: "Gift row and sheets", href: "/preview/gift/buy-sheet" },
      { title: "Gift thank-you (buyer)", href: "/preview/gift/buyer-thank-you" },
    ]);
  });

  it("places Gift pages after Thank-you pages", () => {
    const titles = pageGroups({
      ...NO_DOCS,
      readings: [{ title: "Birth Chart Reading", slug: "birth-chart" }],
    }).map((group) => group.title);

    expect(titles).toEqual(["Site", "Booking pages", "Thank-you pages", "Gift pages", "Other pages"]);
  });
});
