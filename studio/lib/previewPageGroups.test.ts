import { describe, expect, it } from "vitest";

import { pageGroups } from "./previewPageGroups";

const NO_DOCS = { readings: [], notes: [], legal: [] };

describe("pageGroups", () => {
  it("lists every gift preview state under Gift pages", () => {
    const giftGroup = pageGroups(NO_DOCS).find((group) => group.title === "Gift pages");

    expect(giftGroup?.pages).toEqual([
      { title: "Gift row and sheets", href: "/preview/gift/buy-sheet" },
      { title: "Gift thank-you (buyer)", href: "/preview/gift/buyer-thank-you" },
      { title: "Gift: redeem sheet", href: "/preview/gift/redeem-sheet" },
      { title: "Gift: opened, with note", href: "/preview/gift/opened" },
      { title: "Gift: no note", href: "/preview/gift/opened-no-note" },
      { title: "Gift: already opened", href: "/preview/gift/already-opened" },
      { title: "Gift: no longer active", href: "/preview/gift/no-longer-active" },
      { title: "Gift: not found", href: "/preview/gift/not-found" },
      { title: "Gift: last page", href: "/preview/gift/last-page" },
      { title: "Gift thank-you (recipient)", href: "/preview/gift/recipient-thank-you" },
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
