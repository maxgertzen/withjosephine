import { describe, expect, it } from "vitest";

import { readingPatches } from "./prepare-readings-2026-10.mts";

const reading = (id: string, orderRank: string | null, onSite: boolean | null) => ({
  _id: id,
  name: id,
  orderRank,
  onSite,
});

describe("readingPatches", () => {
  it("ranks unranked readings, drafts with their published rank, and switches on readings with no value", () => {
    const patches = readingPatches([
      reading("a", null, null),
      reading("b", null, false),
      reading("drafts.a", null, null),
    ]);
    expect(patches.get("a")).toEqual({ orderRank: "0|100000:", onSite: true });
    expect(patches.get("b")).toEqual({ orderRank: "0|200000:" });
    expect(patches.get("drafts.a")).toEqual({ orderRank: "0|100000:", onSite: true });
  });

  it("leaves ranked readings with a value alone", () => {
    expect(readingPatches([reading("a", "0|100000:", true)]).size).toBe(0);
  });

  it("gives a draft of a ranked reading the published rank", () => {
    expect(readingPatches([reading("a", "0|100000:", true), reading("drafts.a", null, true)]).get("drafts.a")).toEqual({
      orderRank: "0|100000:",
    });
  });

  it("refuses to rank more readings than the rank format holds", () => {
    const many = Array.from({ length: 36 }, (_, index) => reading(`r${index}`, null, true));
    expect(() => readingPatches(many)).toThrow();
  });

  it("refuses when only some readings have a rank", () => {
    expect(() => readingPatches([reading("a", "0|100000:", true), reading("b", null, true)])).toThrow();
  });
});
