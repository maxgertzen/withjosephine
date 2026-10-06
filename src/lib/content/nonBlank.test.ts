import { describe, expect, it } from "vitest";

import { linesWithText, nonBlank } from "./nonBlank";

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
