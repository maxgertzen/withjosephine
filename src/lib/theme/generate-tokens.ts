import type { SanityTheme } from "@/lib/sanity/types";

import {
  BODY_FONTS,
  BUILT_IN_THEME_COLORS,
  COLOR_CONFIG,
  DEFAULT_BODY_FONT,
  DEFAULT_DISPLAY_FONT,
  DISPLAY_FONTS,
  extractHex,
  type FontConfig,
  hexChannels,
  type SemanticColorKey,
} from "./palette";

function hexToRgb(hex: string): string {
  return hexChannels(hex).join(", ");
}

export function generateTokensCss(theme: SanityTheme | null): string {
  if (!theme?.colors) return "";

  const lines: string[] = [];
  lines.push("/* Auto-generated from Sanity theme — do not edit manually */");
  lines.push(":root {");

  const paletteAliases: string[] = [];

  for (const [field, config] of Object.entries(COLOR_CONFIG)) {
    const color = theme.colors[field as SemanticColorKey];
    const hex = extractHex(color?.hex);
    if (hex) {
      lines.push(`  ${config.semantic}: ${hex};`);
    }
    if (config.palette) {
      paletteAliases.push(`  ${config.palette}: var(${config.semantic});`);
    }
  }

  lines.push("");
  lines.push("  /* Palette aliases (derived from semantic vars) */");
  lines.push(...paletteAliases);

  lines.push("");
  lines.push("  /* RGB channels for opacity variants */");
  const accentHex = extractHex(theme.colors.accent?.hex);
  if (accentHex) {
    lines.push(`  --j-accent-rgb: ${hexToRgb(accentHex)};`);
    lines.push(`  --j-gold-rgb: var(--j-accent-rgb);`);
  }
  const bgInteractiveHex = extractHex(theme.colors.bgInteractive?.hex);
  if (bgInteractiveHex) {
    lines.push(`  --j-bg-interactive-rgb: ${hexToRgb(bgInteractiveHex)};`);
    lines.push(`  --j-deep-rgb: var(--j-bg-interactive-rgb);`);
  }

  lines.push("}");
  return lines.join("\n");
}

const EMAIL_TOKEN_DEFAULTS = {
  ink: BUILT_IN_THEME_COLORS.bgInteractive,
  body: BUILT_IN_THEME_COLORS.textPrimary,
  muted: BUILT_IN_THEME_COLORS.textMuted,
  divider: BUILT_IN_THEME_COLORS.blush,
  cream: BUILT_IN_THEME_COLORS.bgPrimary,
  warm: BUILT_IN_THEME_COLORS.bgSection,
  gold: BUILT_IN_THEME_COLORS.accent,
  mutedOnWarm: "#6F6560",
} as const;

const EMAIL_COLOR_SOURCES: Partial<Record<keyof typeof EMAIL_TOKEN_DEFAULTS, SemanticColorKey>> = {
  ink: "bgInteractive",
  body: "textPrimary",
  muted: "textMuted",
  divider: "blush",
  cream: "bgPrimary",
  warm: "bgSection",
  gold: "accent",
};

export function generateEmailTokensModule(theme: SanityTheme | null): string {
  const colors = (Object.keys(EMAIL_TOKEN_DEFAULTS) as Array<keyof typeof EMAIL_TOKEN_DEFAULTS>)
    .map((tokenKey) => {
      const sanityKey = EMAIL_COLOR_SOURCES[tokenKey];
      const overrideHex = sanityKey ? extractHex(theme?.colors?.[sanityKey]?.hex) : undefined;
      const value = overrideHex ?? EMAIL_TOKEN_DEFAULTS[tokenKey];
      return `  ${tokenKey}: "${value}",`;
    })
    .join("\n");

  const displayFontName = theme?.displayFont && DISPLAY_FONTS[theme.displayFont]
    ? theme.displayFont
    : DEFAULT_DISPLAY_FONT;
  const bodyFontName = theme?.bodyFont && BODY_FONTS[theme.bodyFont]
    ? theme.bodyFont
    : DEFAULT_BODY_FONT;

  const serifStack = `'${displayFontName}', Georgia, serif`;
  const sansStack = `${bodyFontName}, -apple-system, Helvetica, Arial, sans-serif`;

  return [
    "/* Auto-generated from Sanity theme — do not edit manually */",
    "export const emailTokens = {",
    colors,
    `  serifFamily: "${serifStack}",`,
    `  sansFamily: "${sansStack}",`,
    "} as const;",
    "",
    "export type EmailTokens = typeof emailTokens;",
  ].join("\n");
}

function getFontConfig(
  fontName: string | undefined,
  registry: Record<string, FontConfig>,
  defaultName: string,
): FontConfig {
  if (fontName && registry[fontName]) return registry[fontName];
  return registry[defaultName];
}

export function generateFontsModule(theme: SanityTheme | null): string {
  const display = getFontConfig(theme?.displayFont, DISPLAY_FONTS, DEFAULT_DISPLAY_FONT);
  const body = getFontConfig(theme?.bodyFont, BODY_FONTS, DEFAULT_BODY_FONT);

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
