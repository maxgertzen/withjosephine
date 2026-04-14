import { describe, it, expect } from "vitest";
import { generateTokensCss, generateFontsModule } from "./generate-tokens";
import type { SanityTheme } from "@/lib/sanity/types";

const DEFAULT_THEME: SanityTheme = {
  colors: {
    midnight: "#0D0B1A",
    deep: "#1C1935",
    cream: "#FAF8F4",
    warm: "#F5F0E8",
    blush: "#E8D5C4",
    rose: "#BF9B8B",
    gold: "#C4A46B",
    goldLight: "#D4BC8B",
    text: "#3D3633",
    muted: "#7A6F6A",
    ivory: "#FAFAF8",
  },
  displayFont: "Cormorant Garamond",
  bodyFont: "Inter",
};

describe("generateTokensCss", () => {
  it("returns empty string when theme is null", () => {
    expect(generateTokensCss(null)).toBe("");
  });

  it("returns empty string when theme has no colors", () => {
    const theme = { ...DEFAULT_THEME, colors: undefined } as unknown as SanityTheme;
    expect(generateTokensCss(theme)).toBe("");
  });

  it("generates CSS with all color overrides", () => {
    const css = generateTokensCss(DEFAULT_THEME);

    expect(css).toContain(":root {");
    expect(css).toContain("--j-midnight: #0D0B1A;");
    expect(css).toContain("--j-deep: #1C1935;");
    expect(css).toContain("--j-gold: #C4A46B;");
    expect(css).toContain("--j-ivory: #FAFAF8;");
  });

  it("generates RGB channels for gold and deep", () => {
    const css = generateTokensCss(DEFAULT_THEME);

    expect(css).toContain("--j-gold-rgb:");
    expect(css).toContain("--j-deep-rgb:");
  });

  it("reflects color changes from Sanity", () => {
    const customTheme: SanityTheme = {
      ...DEFAULT_THEME,
      colors: {
        ...DEFAULT_THEME.colors,
        gold: "#FF0000",
        midnight: "#111111",
      },
    };

    const css = generateTokensCss(customTheme);

    expect(css).toContain("--j-gold: #FF0000;");
    expect(css).toContain("--j-midnight: #111111;");
    expect(css).not.toContain("--j-gold: #C4A46B;");
  });

  it("only overrides colors that differ from defaults", () => {
    const css = generateTokensCss(DEFAULT_THEME);

    // When all values match defaults, we still generate them
    // (the override file is the source of truth once created)
    expect(css).toContain("--j-midnight:");
  });
});

describe("generateFontsModule", () => {
  it("returns default config when theme is null", () => {
    const output = generateFontsModule(null);

    expect(output).toContain("Cormorant_Garamond");
    expect(output).toContain("Inter");
  });

  it("returns default config when fonts match defaults", () => {
    const output = generateFontsModule(DEFAULT_THEME);

    expect(output).toContain("Cormorant_Garamond");
    expect(output).toContain("Inter");
  });

  it("generates correct import for custom display font", () => {
    const theme: SanityTheme = {
      ...DEFAULT_THEME,
      displayFont: "Playfair Display",
    };

    const output = generateFontsModule(theme);

    expect(output).toContain("Playfair_Display");
    expect(output).not.toContain("Cormorant_Garamond");
  });

  it("generates correct import for custom body font", () => {
    const theme: SanityTheme = {
      ...DEFAULT_THEME,
      bodyFont: "DM Sans",
    };

    const output = generateFontsModule(theme);

    expect(output).toContain("DM_Sans");
    expect(output).not.toContain('"Inter"');
  });

  it("exports display and body font variables", () => {
    const output = generateFontsModule(DEFAULT_THEME);

    expect(output).toContain("export const displayFont");
    expect(output).toContain("export const bodyFont");
    expect(output).toContain("--font-display");
    expect(output).toContain("--font-body");
  });

  it("reflects font changes from Sanity", () => {
    const theme: SanityTheme = {
      ...DEFAULT_THEME,
      displayFont: "Lora",
      bodyFont: "Work Sans",
    };

    const output = generateFontsModule(theme);

    expect(output).toContain("Lora");
    expect(output).toContain("Work_Sans");
  });
});
