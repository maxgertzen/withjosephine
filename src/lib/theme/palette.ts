import type { SanityThemeColors } from "@/lib/sanity/types";

export const BACKGROUND_PRESETS = {
  "Cream": "#FAF8F4",
  "Warm Linen": "#F5F0E8",
  "Ivory": "#FAFAF8",
  "Snow": "#FFFAFA",
  "Alabaster": "#F2F0EB",
};

export const DARK_PRESETS = {
  "Midnight": "#0D0B1A",
  "Deep Indigo": "#1C1935",
  "Charcoal": "#1A1A2E",
  "Obsidian": "#0B0B0F",
};

export const ACCENT_PRESETS = {
  "Gold": "#C4A46B",
  "Gold Light": "#D4BC8B",
  "Amber": "#D4A853",
  "Champagne": "#C9B77D",
  "Copper": "#B87333",
};

export const SKIN_TONE_PRESETS = {
  "Blush": "#E8D5C4",
  "Rose": "#BF9B8B",
  "Dusty Rose": "#C9A9A6",
  "Mauve": "#C4A4A7",
  "Peach": "#E8C8B8",
};

export const TEXT_PRESETS = {
  "Warm Charcoal": "#3D3633",
  "Soft Black": "#2B2826",
  "Muted": "#7A6F6A",
  "Stone": "#5C5652",
};

export const ALL_COLOR_PRESETS: readonly string[] = [
  ...Object.values(BACKGROUND_PRESETS),
  ...Object.values(DARK_PRESETS),
  ...Object.values(TEXT_PRESETS),
  ...Object.values(ACCENT_PRESETS),
  ...Object.values(SKIN_TONE_PRESETS),
];

export type SemanticColorKey = keyof SanityThemeColors;

type ColorConfig = {
  semantic: string;
  palette?: string;
};

export const COLOR_CONFIG: Record<SemanticColorKey, ColorConfig> = {
  bgPrimary: { semantic: "--j-bg-primary", palette: "--j-cream" },
  bgSection: { semantic: "--j-bg-section", palette: "--j-warm" },
  bgDark: { semantic: "--j-bg-dark", palette: "--j-midnight" },
  bgInteractive: { semantic: "--j-bg-interactive", palette: "--j-deep" },
  textPrimary: { semantic: "--j-text-primary", palette: "--j-text" },
  textHeading: { semantic: "--j-text-heading" },
  textMuted: { semantic: "--j-text-muted", palette: "--j-muted" },
  textOnDark: { semantic: "--j-text-on-dark" },
  accent: { semantic: "--j-accent", palette: "--j-gold" },
  accentLight: { semantic: "--j-accent-light", palette: "--j-gold-light" },
  blush: { semantic: "--j-blush" },
  rose: { semantic: "--j-rose" },
  ivory: { semantic: "--j-ivory" },
};

export const BUILT_IN_THEME_COLORS: Record<SemanticColorKey, string> = {
  bgPrimary: "#FAF8F4",
  bgSection: "#F5F0E8",
  bgDark: "#0D0B1A",
  bgInteractive: "#1C1935",
  textPrimary: "#3D3633",
  textHeading: "#0D0B1A",
  textMuted: "#7A6F6A",
  textOnDark: "#FAF8F4",
  accent: "#C4A46B",
  accentLight: "#D4BC8B",
  blush: "#E8D5C4",
  rose: "#BF9B8B",
  ivory: "#FAFAF8",
};

export function extractHex(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.startsWith("#") ? value : undefined;
  }
  if (value && typeof value === "object" && "hex" in value) {
    return extractHex((value as { hex: unknown }).hex);
  }
  return undefined;
}

export function themeColorOrBuiltIn(
  themeColors: Partial<Record<SemanticColorKey, unknown>> | null | undefined,
  key: SemanticColorKey,
): string {
  return extractHex(themeColors?.[key]) ?? BUILT_IN_THEME_COLORS[key];
}

function sixDigitHex(hex: string): string {
  const digits = hex.slice(1);
  if (digits.length === 3 || digits.length === 4) {
    return digits.slice(0, 3).split("").map((digit) => digit + digit).join("");
  }
  return digits.slice(0, 6);
}

export function hexChannels(hex: string): [number, number, number] {
  const digits = sixDigitHex(hex);
  return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)) as [number, number, number];
}

export const READABLE_CONTRAST = 4.5;

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexChannels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export type FontConfig = {
  importName: string;
  variable: string;
  weights: string[];
  styles: string[];
};

export const DEFAULT_DISPLAY_FONT = "Cormorant Garamond";
export const DEFAULT_BODY_FONT = "Inter";

export const DISPLAY_FONTS: Record<string, FontConfig> = {
  "Cormorant Garamond": {
    importName: "Cormorant_Garamond",
    variable: "--font-display-source",
    weights: ["300", "400", "500", "600"],
    styles: ["normal", "italic"],
  },
  "Playfair Display": {
    importName: "Playfair_Display",
    variable: "--font-display-source",
    weights: ["400", "500", "600", "700"],
    styles: ["normal", "italic"],
  },
  "EB Garamond": {
    importName: "EB_Garamond",
    variable: "--font-display-source",
    weights: ["400", "500", "600"],
    styles: ["normal", "italic"],
  },
  Lora: {
    importName: "Lora",
    variable: "--font-display-source",
    weights: ["400", "500", "600", "700"],
    styles: ["normal", "italic"],
  },
  "Crimson Text": {
    importName: "Crimson_Text",
    variable: "--font-display-source",
    weights: ["400", "600", "700"],
    styles: ["normal", "italic"],
  },
  "Libre Baskerville": {
    importName: "Libre_Baskerville",
    variable: "--font-display-source",
    weights: ["400", "700"],
    styles: ["normal", "italic"],
  },
};

export const BODY_FONTS: Record<string, FontConfig> = {
  Inter: {
    importName: "Inter",
    variable: "--font-body-source",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "DM Sans": {
    importName: "DM_Sans",
    variable: "--font-body-source",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "Source Sans 3": {
    importName: "Source_Sans_3",
    variable: "--font-body-source",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "Nunito Sans": {
    importName: "Nunito_Sans",
    variable: "--font-body-source",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "Work Sans": {
    importName: "Work_Sans",
    variable: "--font-body-source",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
};

export const DISPLAY_FONT_NAMES = Object.keys(DISPLAY_FONTS);
export const LINKS_PAGE_SLAB_FONT_NAMES = ["Bitter", "Zilla Slab", "Roboto Slab"];
export const LINKS_PAGE_NAME_FONT_NAMES = [...DISPLAY_FONT_NAMES, ...LINKS_PAGE_SLAB_FONT_NAMES];
export const BODY_FONT_NAMES = Object.keys(BODY_FONTS);
export const LINKS_PAGE_TEXT_FONT_NAMES = [...BODY_FONT_NAMES, "Lora", "Bitter", "Libre Baskerville"];

export type FontCut = { weight: string; italic: boolean };

export function fontFileSlug(family: string): string {
  return family.toLowerCase().replace(/ /g, "-");
}

export function fontFileName(family: string, cut: FontCut): string {
  return `${fontFileSlug(family)}-${cut.weight}${cut.italic ? "-italic" : ""}.woff2`;
}

export const LINKS_PAGE_SLANTED_NAME_CUTS: Record<string, FontCut> = {
  "Cormorant Garamond": { weight: "300", italic: true },
  "Playfair Display": { weight: "400", italic: true },
  "EB Garamond": { weight: "400", italic: true },
  Lora: { weight: "400", italic: true },
  "Crimson Text": { weight: "400", italic: true },
  "Libre Baskerville": { weight: "400", italic: true },
  Bitter: { weight: "300", italic: true },
  "Zilla Slab": { weight: "300", italic: true },
  "Roboto Slab": { weight: "300", italic: false },
};

export const LINKS_PAGE_BOLD_NAME_CUT: FontCut = { weight: "700", italic: false };

export const LINKS_PAGE_TEXT_CUT: FontCut = { weight: "500", italic: false };

export const LINKS_PAGE_TEXT_CUTS: Record<string, FontCut> = {
  "Libre Baskerville": { weight: "400", italic: false },
};

export function siteFontCut(font: FontConfig | undefined, target: string, slanted: boolean): FontCut {
  const weights = (font?.weights ?? [target]).map(Number);
  const wanted = Number(target);
  const nearest = weights.reduce((best, weight) => (Math.abs(weight - wanted) < Math.abs(best - wanted) ? weight : best));
  return { weight: String(nearest), italic: slanted && (font?.styles.includes("italic") ?? false) };
}

export const LINKS_PAGE_SERIF_FONT_NAMES = new Set([...LINKS_PAGE_NAME_FONT_NAMES, "Lora", "Bitter", "Libre Baskerville"]);
