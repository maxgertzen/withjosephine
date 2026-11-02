import { COLOR_CONFIG, extractHex, type SemanticColorKey } from "./palette";

const CSS_HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export type LinksPageColours = {
  pageColour?: unknown;
  wordsColour?: unknown;
  buttonColour?: unknown;
  buttonWordsColour?: unknown;
};

const ROLE_KEYS: Record<keyof LinksPageColours, SemanticColorKey[]> = {
  pageColour: ["bgPrimary"],
  wordsColour: ["textPrimary", "textHeading", "textMuted"],
  buttonColour: ["bgInteractive"],
  buttonWordsColour: ["textOnDark"],
};

function safeCssHex(value: unknown): string | undefined {
  const hex = extractHex(value);
  return hex && CSS_HEX.test(hex) ? hex : undefined;
}

export function linksPageColourVariables(colours: LinksPageColours): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [role, keys] of Object.entries(ROLE_KEYS) as [keyof LinksPageColours, SemanticColorKey[]][]) {
    const hex = safeCssHex(colours[role]);
    if (!hex) continue;
    for (const key of keys) {
      const { semantic, palette } = COLOR_CONFIG[key];
      variables[semantic] = hex;
      if (palette) variables[palette] = hex;
    }
  }
  return variables;
}
