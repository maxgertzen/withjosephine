import { describe, expect, it } from "vitest";

import { linesFromHowItWorks } from "./migrate-how-it-works-to-lines-2026-10.mts";

describe("linesFromHowItWorks", () => {
  it("turns each paragraph into one line, joining its spans", () => {
    expect(
      linesFromHowItWorks([
        { _type: "block", children: [{ text: "You fill in " }, { text: "the form." }] },
        { _type: "block", children: [{ text: "I begin within two days." }] },
      ]),
    ).toEqual(["You fill in the form.", "I begin within two days."]);
  });

  it("drops blank paragraphs and keeps lines already converted", () => {
    expect(
      linesFromHowItWorks([
        "Already a line.",
        { _type: "block", children: [{ text: "   " }] },
        { _type: "block", children: [] },
      ]),
    ).toEqual(["Already a line."]);
  });
});
