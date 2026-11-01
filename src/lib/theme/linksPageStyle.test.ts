import { describe, expect, it } from "vitest";

import { linksPageColourVariables, safeCssHex } from "./linksPageStyle";

describe("linksPageColourVariables", () => {
  it("sets nothing for colours left blank", () => {
    expect(linksPageColourVariables({})).toEqual({});
  });

  it("sets both the role variable and its palette name, so every site class picks the colour up", () => {
    expect(
      linksPageColourVariables({
        pageColour: { hex: "#0D0B1A" },
        wordsColour: { hex: { hex: "#FAF8F4" } },
        buttonColour: { hex: "#C4A46B" },
        buttonWordsColour: { hex: "#0D0B1A" },
      }),
    ).toEqual({
      "--j-bg-primary": "#0D0B1A",
      "--j-cream": "#0D0B1A",
      "--j-text-primary": "#FAF8F4",
      "--j-text": "#FAF8F4",
      "--j-text-heading": "#FAF8F4",
      "--j-text-muted": "#FAF8F4",
      "--j-muted": "#FAF8F4",
      "--j-bg-interactive": "#C4A46B",
      "--j-deep": "#C4A46B",
      "--j-text-on-dark": "#0D0B1A",
    });
  });
});

describe("safeCssHex", () => {
  it("lets only plain hex colours through", () => {
    expect(safeCssHex({ hex: "#abc" })).toBe("#abc");
    expect(safeCssHex({ hex: "#fff}body{display:none" })).toBeUndefined();
    expect(safeCssHex("red")).toBeUndefined();
  });
});
