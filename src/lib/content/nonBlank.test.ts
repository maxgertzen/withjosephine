import { describe, expect, it } from "vitest";

import { linesWithText, nonBlank, withNonBlankOverrides } from "./nonBlank";

const PRESENTATION_SOURCE_MAP_MARKER = "​‌‍﻿".repeat(10);

describe("nonBlank", () => {
  it("trims text and treats whitespace as missing", () => {
    expect(nonBlank("  Hello ")).toBe("Hello");
    expect(nonBlank("   ")).toBeUndefined();
    expect(nonBlank(null)).toBeUndefined();
  });

  it("treats a value carrying only Presentation's invisible source-map marker as missing", () => {
    expect(nonBlank(` ${PRESENTATION_SOURCE_MAP_MARKER}`)).toBeUndefined();
  });
});

describe("linesWithText", () => {
  it("keeps lines with text and drops blank, marker-only and non-text items", () => {
    expect(
      linesWithText(["One.", " ", PRESENTATION_SOURCE_MAP_MARKER, { _type: "block" }, "Two."]),
    ).toEqual(["One.", "Two."]);
  });
});

describe("withNonBlankOverrides", () => {
  it("keeps the built-in words for blank, spaces-only and missing values, takes real words exactly as typed and non-text values, and ignores unknown keys", () => {
    const defaults = { subject: "Hello", label: "Or copy this link:", heroLine: "Welcome", links: [{ _type: "default" }] };

    expect(
      withNonBlankOverrides(defaults, { subject: "  Hi there ", label: "   ", heroLine: null, links: [{ _type: "link" }], extra: "x" } as never),
    ).toEqual({ subject: "  Hi there ", label: "Or copy this link:", heroLine: "Welcome", links: [{ _type: "link" }] });
    expect(withNonBlankOverrides(defaults, null)).toEqual(defaults);
  });

  it("keeps the built-in body when the Sanity body has no text", () => {
    const defaults = { body: [{ _type: "block", children: [{ _type: "span", text: "Built-in." }] }] };
    const emptyBlock = { _type: "block", children: [{ _type: "span", text: "  " }] };
    const realBlock = { _type: "block", children: [{ _type: "span", text: "Becky's words." }] };

    expect(withNonBlankOverrides(defaults, { body: [] })).toEqual(defaults);
    expect(withNonBlankOverrides(defaults, { body: [emptyBlock] })).toEqual(defaults);
    expect(withNonBlankOverrides(defaults, { body: [emptyBlock, realBlock] })).toEqual({ body: [emptyBlock, realBlock] });
  });

  it("keeps an empty list Becky saved when the built-in value is a list of items, not text", () => {
    const defaults = { navLinks: [{ label: "Readings", sectionId: "readings" }], showBadge: true };

    expect(withNonBlankOverrides(defaults, { navLinks: [], showBadge: false })).toEqual({ navLinks: [], showBadge: false });
  });
});
