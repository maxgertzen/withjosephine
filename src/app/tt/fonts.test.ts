import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

type FontFile = { path: string; weight: string; style: string };
type LocalFontOptions = { src: FontFile[]; preload?: boolean; adjustFontFallback?: unknown };

const { calls } = vi.hoisted(() => ({ calls: [] as LocalFontOptions[] }));

vi.mock("next/font/local", () => ({
  default: (options: LocalFontOptions) => {
    calls.push(options);
    return { style: { fontFamily: `'${options.src[0].path}'` }, className: "", variable: "" };
  },
}));

import {
  fontFileName,
  LINKS_PAGE_BOLD_NAME_CUT,
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

const loadedFiles = () => calls.flatMap(({ src }) => src.map((file) => path.basename(file.path)));

const filesOf = (fontFamily: string) =>
  calls.find((call) => `'${call.src[0].path}'` === fontFamily)?.src ?? [];

describe("links page fonts", () => {
  it("loads every font from a latin-only file in the repo, without preloading, keeping the fallback size adjustment", () => {
    expect(calls).toHaveLength(
      LINKS_PAGE_NAME_FONT_NAMES.length * 2 + LINKS_PAGE_TEXT_FONT_NAMES.length,
    );
    for (const call of calls) {
      expect(call.preload).toBe(false);
      expect(call.adjustFontFallback).not.toBe(false);
      for (const file of call.src) {
        expect(existsSync(path.join(import.meta.dirname, file.path)), file.path).toBe(true);
      }
    }
  });

  it("loads the slanted and the bold name cuts the Studio font preview shows", () => {
    for (const font of LINKS_PAGE_NAME_FONT_NAMES) {
      expect(loadedFiles(), font).toContain(fontFileName(font, LINKS_PAGE_SLANTED_NAME_CUTS[font]));
      expect(loadedFiles(), font).toContain(fontFileName(font, LINKS_PAGE_BOLD_NAME_CUT));
    }
  });

  it("loads only upright cuts for the words, in the weight the Studio font preview shows", () => {
    for (const font of LINKS_PAGE_TEXT_FONT_NAMES) {
      const cut = LINKS_PAGE_TEXT_CUTS[font] ?? LINKS_PAGE_TEXT_CUT;
      expect(loadedFiles(), font).toContain(fontFileName(font, cut));
      for (const file of filesOf(LINKS_PAGE_BODY_FONTS[font].style.fontFamily)) {
        expect(file.style, file.path).toBe("normal");
        expect(file.weight, file.path).not.toBe("700");
      }
    }
  });

  it("offers the same names for both name styles, and the Theme body fonts plus three serifs for the words", () => {
    expect(Object.keys(LINKS_PAGE_NAME_FONTS)).toEqual(LINKS_PAGE_NAME_FONT_NAMES);
    expect(Object.keys(LINKS_PAGE_BOLD_NAME_FONTS)).toEqual(LINKS_PAGE_NAME_FONT_NAMES);
    expect(Object.keys(LINKS_PAGE_BODY_FONTS)).toEqual(LINKS_PAGE_TEXT_FONT_NAMES);
  });

  it("points the site font variables at the chosen fonts", () => {
    expect(linksPageFontVariables("Playfair Display", "Work Sans", "slanted")).toEqual({
      "--font-display-source": "'./fonts/playfair-display-400-italic.woff2'",
      "--font-body-source": "'./fonts/work-sans-400.woff2'",
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
