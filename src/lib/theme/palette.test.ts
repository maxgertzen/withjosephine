import { describe, expect, it } from "vitest";

import {
  ALL_COLOR_PRESETS,
  BODY_FONT_NAMES,
  contrastRatio,
  DEFAULT_BODY_FONT,
  DEFAULT_DISPLAY_FONT,
  DISPLAY_FONT_NAMES,
  extractHex,
} from "./palette";

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("is the same whichever colour comes first", () => {
    expect(contrastRatio("#1c1935", "#faf8f4")).toBeCloseTo(contrastRatio("#faf8f4", "#1c1935"), 10);
  });

  it("reads short and eight-digit hex the same as six-digit", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffffcc", "#000000")).toBeCloseTo(21, 5);
  });

  it("puts gold on cream under the readable line", () => {
    expect(contrastRatio("#C4A46B", "#FAF8F4")).toBeLessThan(4.5);
  });
});

describe("extractHex", () => {
  it("walks nested hex values down to the string", () => {
    expect(extractHex({ hex: { hex: { hex: "#0D0B1A" } } })).toBe("#0D0B1A");
  });

  it("returns undefined for anything that is not a hex colour", () => {
    expect(extractHex("red")).toBeUndefined();
    expect(extractHex(undefined)).toBeUndefined();
  });
});

describe("palette lists", () => {
  it("offers every preset as a six-digit hex, once", () => {
    for (const hex of ALL_COLOR_PRESETS) expect(hex).toMatch(/^#[0-9A-F]{6}$/i);
    expect(new Set(ALL_COLOR_PRESETS).size).toBe(ALL_COLOR_PRESETS.length);
  });

  it("keeps the six display fonts and five body fonts, defaults included", () => {
    expect(DISPLAY_FONT_NAMES).toHaveLength(6);
    expect(BODY_FONT_NAMES).toHaveLength(5);
    expect(DISPLAY_FONT_NAMES).toContain(DEFAULT_DISPLAY_FONT);
    expect(BODY_FONT_NAMES).toContain(DEFAULT_BODY_FONT);
  });
});
