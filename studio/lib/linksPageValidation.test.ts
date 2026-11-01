import { describe, expect, it, vi } from "vitest";

import { BUILT_IN_THEME_COLORS } from "@/lib/theme/palette";

import {
  bothColoursPicked,
  checkButtonTarget,
  COLOURS_TOO_CLOSE,
  noButtonGoesToTheSamePlace,
  readablePair,
  reuseSiteColoursFor,
  SAME_PLACE_TWICE,
  type SiteColours,
  siteColoursFromTheme,
} from "./linksPageValidation";

describe("readablePair", () => {
  it("accepts dark words on a light page", () => {
    expect(readablePair({ hex: "#1C1935" }, "#3d3633", { hex: "#FAF8F4" }, "#faf8f4")).toBe(true);
  });

  it("refuses gold words on cream", () => {
    expect(readablePair({ hex: "#C4A46B" }, "#3d3633", undefined, "#faf8f4")).toBe(COLOURS_TOO_CLOSE);
  });

  it("uses the site colour for a blank pick", () => {
    expect(readablePair(undefined, "#faf8f4", { hex: "#FAF8F4" }, "#1c1935")).toBe(COLOURS_TOO_CLOSE);
    expect(readablePair(undefined, "#3d3633", undefined, "#faf8f4")).toBe(true);
  });

  it("reads nested hex values", () => {
    expect(readablePair({ hex: { hex: "#0D0B1A" } }, "#3d3633", undefined, "#faf8f4")).toBe(true);
  });
});

describe("siteColoursFromTheme", () => {
  it("falls back to the built-in colours when the Theme has none", () => {
    expect(siteColoursFromTheme(null)).toEqual({
      bgPrimary: BUILT_IN_THEME_COLORS.bgPrimary,
      textPrimary: BUILT_IN_THEME_COLORS.textPrimary,
      bgInteractive: BUILT_IN_THEME_COLORS.bgInteractive,
      textOnDark: BUILT_IN_THEME_COLORS.textOnDark,
    });
  });

  it("takes Theme colours, nested or not", () => {
    const colours = siteColoursFromTheme({ bgPrimary: { hex: "#F5F0E8" }, textPrimary: { hex: { hex: "#2B2826" } } });
    expect(colours.bgPrimary).toBe("#F5F0E8");
    expect(colours.textPrimary).toBe("#2B2826");
    expect(colours.bgInteractive).toBe(BUILT_IN_THEME_COLORS.bgInteractive);
  });
});

describe("noButtonGoesToTheSamePlace", () => {
  it("accepts different places", () => {
    expect(
      noButtonGoesToTheSamePlace([
        { destination: "reading", reading: { _ref: "a" } },
        { destination: "reading", reading: { _ref: "b" } },
        { destination: "home" },
        { destination: "web", url: "https://instagram.com/withjosephine" },
        { destination: "web", url: "https://instagram.com/p/1" },
      ]),
    ).toBe(true);
  });

  it("refuses two buttons to the same reading", () => {
    expect(
      noButtonGoesToTheSamePlace([
        { destination: "reading", reading: { _ref: "a" } },
        { destination: "reading", reading: { _ref: "a" } },
      ]),
    ).toBe(SAME_PLACE_TWICE);
  });

  it("refuses the same website written two ways", () => {
    expect(
      noButtonGoesToTheSamePlace([
        { destination: "web", url: "https://instagram.com/withjosephine/" },
        { destination: "web", url: "https://Instagram.com/withjosephine" },
      ]),
    ).toBe(SAME_PLACE_TWICE);
  });

  it("ignores buttons that do not point anywhere yet", () => {
    expect(noButtonGoesToTheSamePlace([{ destination: "reading" }, { destination: "reading" }, {}])).toBe(true);
  });
});

describe("noButtonGoesToTheSamePlace with leftover picks", () => {
  it("ignores a reading left behind on a button that now goes to a note", () => {
    expect(
      noButtonGoesToTheSamePlace([
        { destination: "note", note: { _ref: "n1" }, reading: { _ref: "a" } },
        { destination: "note", note: { _ref: "n2" }, reading: { _ref: "a" } },
      ]),
    ).toBe(true);
  });

  it("tells two different email addresses apart and refuses the same one twice", () => {
    expect(
      noButtonGoesToTheSamePlace([
        { destination: "email", email: "hello@withjosephine.com" },
        { destination: "email", email: "becky@example.com" },
      ]),
    ).toBe(true);
    expect(
      noButtonGoesToTheSamePlace([
        { destination: "email", email: "hello@withjosephine.com" },
        { destination: "email", email: "Hello@withjosephine.com" },
      ]),
    ).toBe(SAME_PLACE_TWICE);
  });
});

describe("bothColoursPicked", () => {
  it("is true only when both colours have a value", () => {
    expect(bothColoursPicked({ hex: "#000000" }, { hex: "#ffffff" })).toBe(true);
    expect(bothColoursPicked({ hex: "#000000" }, undefined)).toBe(false);
    expect(bothColoursPicked(undefined, undefined)).toBe(false);
  });
});

describe("reuseSiteColoursFor", () => {
  const colours: SiteColours = siteColoursFromTheme(null);

  it("loads once and reuses the answer within the window", async () => {
    let clock = 0;
    const load = vi.fn(async () => colours);
    const get = reuseSiteColoursFor(60_000, () => clock);
    await get(load);
    clock = 59_999;
    await get(load);
    expect(load).toHaveBeenCalledTimes(1);
    clock = 60_000;
    await get(load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("tries again on the next call after a failed load", async () => {
    const load = vi.fn<() => Promise<SiteColours | null>>().mockResolvedValueOnce(null).mockResolvedValueOnce(colours);
    const get = reuseSiteColoursFor(60_000, () => 0);
    expect(await get(load)).toBeNull();
    expect(await get(load)).toEqual(colours);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("checkButtonTarget", () => {
  it("asks for the target only when that destination is picked", () => {
    expect(checkButtonTarget("reading", "reading", undefined)).toBe("Pick which reading this button goes to.");
    expect(checkButtonTarget("reading", "web", undefined)).toBe(true);
  });

  it("never blocks on a hidden field that still holds an old bad value", () => {
    expect(checkButtonTarget("email", "web", "hello@")).toBe(true);
    expect(checkButtonTarget("web", "email", "http://old.example.com")).toBe(true);
  });

  it("checks the email address and website address when they are picked", () => {
    expect(checkButtonTarget("email", "email", "hello@")).toBe("This does not look like an email address.");
    expect(checkButtonTarget("email", "email", "hello@withjosephine.com")).toBe(true);
    expect(checkButtonTarget("web", "web", "http://example.com")).toBe("The address must start with https://");
    expect(checkButtonTarget("web", "web", "https://example.com")).toBe(true);
  });
});
