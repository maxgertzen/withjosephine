import { describe, expect, it, vi } from "vitest";

const { calls } = vi.hoisted(() => ({ calls: [] as { family: string; options: Record<string, unknown> }[] }));

vi.mock("next/font/google", () => {
  const families = [
    "Cormorant_Garamond",
    "Playfair_Display",
    "EB_Garamond",
    "Lora",
    "Crimson_Text",
    "Libre_Baskerville",
    "Bitter",
    "Zilla_Slab",
    "Roboto_Slab",
    "Inter",
    "DM_Sans",
    "Source_Sans_3",
    "Nunito_Sans",
    "Work_Sans",
  ];
  return Object.fromEntries(
    families.map((family) => [
      family,
      (options: Record<string, unknown>) => {
        calls.push({ family, options });
        return { style: { fontFamily: `'__${family}'` }, className: "", variable: "" };
      },
    ]),
  );
});

import {
  LINKS_PAGE_NAME_FONT_NAMES,
  LINKS_PAGE_SLANTED_NAME_CUTS,
  LINKS_PAGE_TEXT_CUT,
  LINKS_PAGE_TEXT_CUTS,
  LINKS_PAGE_TEXT_FONT_NAMES,
} from "@/lib/theme/palette";

import {
  LINKS_PAGE_BODY_FONTS,
  LINKS_PAGE_BOLD_NAME_FONTS,
  LINKS_PAGE_NAME_FONTS,
  linksPageFontVariables,
} from "./fonts";

const isBoldCut = (call: (typeof calls)[number]) =>
  JSON.stringify(call.options.weight) === '["700"]' && JSON.stringify(call.options.style) === '["normal"]';

describe("links page fonts", () => {
  it("loads every font without preloading, latin only, keeping the fallback size adjustment", () => {
    expect(calls).toHaveLength(LINKS_PAGE_NAME_FONT_NAMES.length * 2 + LINKS_PAGE_TEXT_FONT_NAMES.length);
    for (const call of calls) {
      expect(call.options.preload, call.family).toBe(false);
      expect(call.options.subsets).toEqual(["latin"]);
      expect(call.options.adjustFontFallback).not.toBe(false);
    }
  });

  it("loads one bold cut per name font and only upright cuts for the words", () => {
    expect(calls.filter(isBoldCut)).toHaveLength(LINKS_PAGE_NAME_FONT_NAMES.length);
    const wordCuts = calls.filter(
      (call) => !isBoldCut(call) && (call.options.weight as string[]).includes("400") && JSON.stringify(call.options.style) === '["normal"]',
    );
    expect(wordCuts).toHaveLength(LINKS_PAGE_TEXT_FONT_NAMES.length);
    for (const call of wordCuts) {
      expect(call.options.style, call.family).toEqual(["normal"]);
      expect(call.options.weight, call.family).not.toContain("700");
    }
  });

  it("loads the slanted name cut that the Studio font preview shows", () => {
    for (const [font, cut] of Object.entries(LINKS_PAGE_SLANTED_NAME_CUTS)) {
      const family = font.replace(/ /g, "_");
      const loader = calls.find((call) => call.family === family && !isBoldCut(call) && (call.options.style as string[]).includes(cut.italic ? "italic" : "normal") && (call.options.weight as string[]).includes(cut.weight));
      expect(loader, font).toBeDefined();
    }
  });

  it("loads the word font weight that the Studio font preview shows", () => {
    for (const font of LINKS_PAGE_TEXT_FONT_NAMES) {
      const { weight } = LINKS_PAGE_TEXT_CUTS[font] ?? LINKS_PAGE_TEXT_CUT;
      const family = font.replace(/ /g, "_");
      const loader = calls.find((call) => call.family === family && !isBoldCut(call) && JSON.stringify(call.options.style) === '["normal"]' && (call.options.weight as string[]).includes(weight));
      expect(loader, font).toBeDefined();
    }
  });

  it("offers the same names for both name styles, and the Theme body fonts plus three serifs for the words", () => {
    expect(Object.keys(LINKS_PAGE_NAME_FONTS)).toEqual(LINKS_PAGE_NAME_FONT_NAMES);
    expect(Object.keys(LINKS_PAGE_BOLD_NAME_FONTS)).toEqual(LINKS_PAGE_NAME_FONT_NAMES);
    expect(Object.keys(LINKS_PAGE_BODY_FONTS)).toEqual(LINKS_PAGE_TEXT_FONT_NAMES);
  });

  it("points the site font variables at the chosen fonts", () => {
    expect(linksPageFontVariables("Playfair Display", "Work Sans", "slanted")).toEqual({
      "--font-display-source": "'__Playfair_Display'",
      "--font-body-source": "'__Work_Sans'",
    });
  });

  it("uses the bold cut of the name font when the name is bold", () => {
    expect(linksPageFontVariables("Zilla Slab", "Bitter", "bold")).toEqual({
      "--font-display-source": LINKS_PAGE_BOLD_NAME_FONTS["Zilla Slab"].style.fontFamily,
      "--font-body-source": LINKS_PAGE_BODY_FONTS.Bitter.style.fontFamily,
    });
    expect(LINKS_PAGE_BOLD_NAME_FONTS["Zilla Slab"]).not.toBe(LINKS_PAGE_NAME_FONTS["Zilla Slab"]);
  });

  it("changes nothing for 'Same as the rest of the site' or an unknown name", () => {
    expect(linksPageFontVariables("site", undefined, "slanted")).toEqual({});
    expect(linksPageFontVariables("Comic Sans", "site", "bold")).toEqual({});
  });
});
