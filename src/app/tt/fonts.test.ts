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

import { BODY_FONT_NAMES, BODY_FONTS, DISPLAY_FONTS, LINKS_PAGE_NAME_FONT_NAMES } from "@/lib/theme/palette";

import { LINKS_PAGE_BODY_FONTS, LINKS_PAGE_NAME_FONTS, linksPageFontVariables } from "./fonts";

describe("links page fonts", () => {
  it("loads every font without preloading, latin only, keeping the fallback size adjustment", () => {
    expect(calls).toHaveLength(LINKS_PAGE_NAME_FONT_NAMES.length + BODY_FONT_NAMES.length);
    for (const call of calls) {
      expect(call.options.preload, call.family).toBe(false);
      expect(call.options.subsets).toEqual(["latin"]);
      expect(call.options.adjustFontFallback).not.toBe(false);
    }
  });

  it("loads the Theme fonts with the Theme weights", () => {
    for (const config of Object.values({ ...DISPLAY_FONTS, ...BODY_FONTS })) {
      const call = calls.find((entry) => entry.family === config.importName);
      expect(call?.options.weight, config.importName).toEqual(config.weights);
    }
  });

  it("offers the Theme fonts plus the slab serifs for the name, and the Theme body fonts", () => {
    expect(Object.keys(LINKS_PAGE_NAME_FONTS)).toEqual(LINKS_PAGE_NAME_FONT_NAMES);
    expect(Object.keys(LINKS_PAGE_BODY_FONTS)).toEqual(BODY_FONT_NAMES);
  });

  it("points the site font variables at the chosen fonts", () => {
    expect(linksPageFontVariables("Playfair Display", "Work Sans")).toEqual({
      "--font-display-source": "'__Playfair_Display'",
      "--font-body-source": "'__Work_Sans'",
    });
  });

  it("changes nothing for 'Same as the rest of the site' or an unknown name", () => {
    expect(linksPageFontVariables("site", undefined)).toEqual({});
    expect(linksPageFontVariables("Comic Sans", "site")).toEqual({});
  });
});
