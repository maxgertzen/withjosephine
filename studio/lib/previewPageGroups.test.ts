import { describe, expect, it } from "vitest";

import { pageGroups } from "./previewPageGroups";

const NO_DOCS = { readings: [], notes: [], legal: [] };

const pagesOf = (title: string, docs: Parameters<typeof pageGroups>[0] = NO_DOCS) =>
  pageGroups(docs).find((group) => group.title === title)?.pages;

describe("pageGroups", () => {
  it("lists every gift preview state under Gift pages", () => {
    expect(pagesOf("Gift pages")?.map(({ href }) => href)).toEqual([
      "/preview/gift/buy-sheet",
      "/preview/gift/buyer-thank-you",
      "/preview/gift/redeem-sheet",
      "/preview/gift/opened",
      "/preview/gift/opened-no-note",
      "/preview/gift/already-opened",
      "/preview/gift/no-longer-active",
      "/preview/gift/not-found",
      "/preview/gift/last-page",
      "/preview/gift/recipient-thank-you",
      "/preview/gift/send-link",
    ]);
  });

  it("orders the groups and lists the Listen and sign-in link pages", () => {
    const titles = pageGroups({
      ...NO_DOCS,
      readings: [{ _id: "reading-birth-chart", title: "Birth Chart Reading", slug: "birth-chart" }],
    }).map((group) => group.title);

    expect(titles).toEqual([
      "Site",
      "Booking pages",
      "Thank-you pages",
      "Gift recipient views",
      "Gift pages",
      "Listen page",
      "Sign-in link page",
      "Other pages",
    ]);
    expect(pagesOf("Listen page")?.[0]).toEqual({ title: "Reading ready", href: "/preview/listen/delivered" });
    expect(pagesOf("Sign-in link page")?.[0]).toEqual({
      title: "Confirm sign-in",
      href: "/preview/sign-in-link/confirm",
    });
  });

  it("gives each reading its gift recipient views", () => {
    const docs = { ...NO_DOCS, readings: [{ _id: "reading-akashic", title: "Akashic", slug: "akashic" }] };
    expect(pagesOf("Gift recipient views", docs)).toEqual([
      { title: "Akashic", href: "/preview/gift/opened?reading=akashic" },
      { title: "Akashic, last page", href: "/preview/gift/last-page?reading=akashic" },
    ]);
  });

  it("shows a draft once, with its draft title, and marks drafts never published and readings off the site", () => {
    const docs = {
      readings: [{ _id: "reading-a", title: "Akashic", slug: "akashic", onSite: false }],
      notes: [
        { _id: "note-1", title: "Old title", slug: "one" },
        { _id: "drafts.note-1", title: "New title", slug: "one" },
        { _id: "drafts.note-2", title: "Fresh", slug: "two" },
      ],
      legal: [],
    };
    expect(pagesOf("Notes", docs)?.map(({ title }) => title)).toEqual(["New title", "Fresh (not published)"]);
    expect(pagesOf("Booking pages", docs)?.[0].title).toBe("Akashic (off the site)");
  });
});
