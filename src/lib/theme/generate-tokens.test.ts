import { describe, expect, it } from "vitest";

import type { SanityTheme } from "@/lib/sanity/types";

import { generateFontsModule, generateTokensCss } from "./generate-tokens";

function color(hex: string) {
  return { hex, alpha: 1 };
}

const DEFAULT_THEME: SanityTheme = {
  colors: {
    bgPrimary: color("#FAF8F4"),
    bgSection: color("#F5F0E8"),
    bgDark: color("#0D0B1A"),
    bgInteractive: color("#1C1935"),
    textPrimary: color("#3D3633"),
    textHeading: color("#0D0B1A"),
    textMuted: color("#7A6F6A"),
    textOnDark: color("#FAF8F4"),
    accent: color("#C4A46B"),
    accentLight: color("#D4BC8B"),
    blush: color("#E8D5C4"),
    rose: color("#BF9B8B"),
    ivory: color("#FAFAF8"),
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

  it("generates CSS with semantic color vars", () => {
    const css = generateTokensCss(DEFAULT_THEME);

    expect(css).toContain(":root {");
    expect(css).toContain("--j-bg-primary: #FAF8F4;");
    expect(css).toContain("--j-bg-dark: #0D0B1A;");
    expect(css).toContain("--j-accent: #C4A46B;");
    expect(css).toContain("--j-ivory: #FAFAF8;");
  });

  it("generates palette aliases derived from semantic vars", () => {
    const css = generateTokensCss(DEFAULT_THEME);

    expect(css).toContain("--j-cream: var(--j-bg-primary);");
    expect(css).toContain("--j-midnight: var(--j-bg-dark);");
    expect(css).toContain("--j-deep: var(--j-bg-interactive);");
    expect(css).toContain("--j-gold: var(--j-accent);");
  });

  it("generates RGB channels for accent and bg-interactive", () => {
    const css = generateTokensCss(DEFAULT_THEME);

    expect(css).toContain("--j-accent-rgb:");
    expect(css).toContain("--j-bg-interactive-rgb:");
    expect(css).toContain("--j-gold-rgb: var(--j-accent-rgb);");
    expect(css).toContain("--j-deep-rgb: var(--j-bg-interactive-rgb);");
  });

  it("reflects color changes from Sanity", () => {
    const customTheme: SanityTheme = {
      ...DEFAULT_THEME,
      colors: {
        ...DEFAULT_THEME.colors,
        accent: color("#FF0000"),
        bgDark: color("#111111"),
      },
    };

    const css = generateTokensCss(customTheme);

    expect(css).toContain("--j-accent: #FF0000;");
    expect(css).toContain("--j-bg-dark: #111111;");
    expect(css).not.toContain("--j-accent: #C4A46B;");
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
