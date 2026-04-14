import type { SanityTheme } from "@/lib/sanity/types";

const COLOR_MAP: Record<string, string> = {
  midnight: "--j-midnight",
  deep: "--j-deep",
  cream: "--j-cream",
  warm: "--j-warm",
  blush: "--j-blush",
  rose: "--j-rose",
  gold: "--j-gold",
  goldLight: "--j-gold-light",
  text: "--j-text",
  muted: "--j-muted",
  ivory: "--j-ivory",
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function generateTokensCss(theme: SanityTheme | null): string {
  if (!theme?.colors) return "";

  const lines: string[] = [];
  lines.push("/* Auto-generated from Sanity theme — do not edit manually */");
  lines.push(":root {");

  for (const [key, cssVar] of Object.entries(COLOR_MAP)) {
    const value = theme.colors[key as keyof typeof theme.colors];
    if (value) {
      lines.push(`  ${cssVar}: ${value};`);
    }
  }

  // RGB channels for opacity variants
  if (theme.colors.gold) {
    lines.push(`  --j-gold-rgb: ${hexToRgb(theme.colors.gold)};`);
  }
  if (theme.colors.deep) {
    lines.push(`  --j-deep-rgb: ${hexToRgb(theme.colors.deep)};`);
  }

  lines.push("}");
  return lines.join("\n");
}

type FontConfig = {
  importName: string;
  variable: string;
  weights: string[];
  styles: string[];
};

const DISPLAY_FONTS: Record<string, FontConfig> = {
  "Cormorant Garamond": {
    importName: "Cormorant_Garamond",
    variable: "--font-display",
    weights: ["300", "400", "500", "600"],
    styles: ["normal", "italic"],
  },
  "Playfair Display": {
    importName: "Playfair_Display",
    variable: "--font-display",
    weights: ["400", "500", "600", "700"],
    styles: ["normal", "italic"],
  },
  "EB Garamond": {
    importName: "EB_Garamond",
    variable: "--font-display",
    weights: ["400", "500", "600"],
    styles: ["normal", "italic"],
  },
  Lora: {
    importName: "Lora",
    variable: "--font-display",
    weights: ["400", "500", "600", "700"],
    styles: ["normal", "italic"],
  },
  "Crimson Text": {
    importName: "Crimson_Text",
    variable: "--font-display",
    weights: ["400", "600", "700"],
    styles: ["normal", "italic"],
  },
  "Libre Baskerville": {
    importName: "Libre_Baskerville",
    variable: "--font-display",
    weights: ["400", "700"],
    styles: ["normal", "italic"],
  },
};

const BODY_FONTS: Record<string, FontConfig> = {
  Inter: {
    importName: "Inter",
    variable: "--font-body",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "DM Sans": {
    importName: "DM_Sans",
    variable: "--font-body",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "Source Sans 3": {
    importName: "Source_Sans_3",
    variable: "--font-body",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "Nunito Sans": {
    importName: "Nunito_Sans",
    variable: "--font-body",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
  "Work Sans": {
    importName: "Work_Sans",
    variable: "--font-body",
    weights: ["300", "400", "500"],
    styles: ["normal"],
  },
};

function getFontConfig(
  fontName: string | undefined,
  registry: Record<string, FontConfig>,
  defaultName: string
): FontConfig {
  if (fontName && registry[fontName]) return registry[fontName];
  return registry[defaultName];
}

export function generateFontsModule(theme: SanityTheme | null): string {
  const display = getFontConfig(theme?.displayFont, DISPLAY_FONTS, "Cormorant Garamond");
  const body = getFontConfig(theme?.bodyFont, BODY_FONTS, "Inter");

  const lines: string[] = [];
  lines.push("/* Auto-generated from Sanity theme — do not edit manually */");
  lines.push(`import { ${display.importName}, ${body.importName} } from "next/font/google";`);
  lines.push("");
  lines.push(`export const displayFont = ${display.importName}({`);
  lines.push('  subsets: ["latin"],');
  lines.push(`  weight: ${JSON.stringify(display.weights)},`);
  if (display.styles.includes("italic")) {
    lines.push(`  style: ${JSON.stringify(display.styles)},`);
  }
  lines.push(`  variable: "${display.variable}",`);
  lines.push('  display: "swap",');
  lines.push("});");
  lines.push("");
  lines.push(`export const bodyFont = ${body.importName}({`);
  lines.push('  subsets: ["latin"],');
  lines.push(`  weight: ${JSON.stringify(body.weights)},`);
  if (body.styles.includes("italic")) {
    lines.push(`  style: ${JSON.stringify(body.styles)},`);
  }
  lines.push(`  variable: "${body.variable}",`);
  lines.push('  display: "swap",');
  lines.push("});");

  return lines.join("\n");
}
