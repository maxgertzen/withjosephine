import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { emailTokens } from "@/lib/theme/email-tokens.generated";
import { BUILT_IN_THEME_COLORS, COLOR_CONFIG, contrastRatio, READABLE_CONTRAST } from "@/lib/theme/palette";

const tokensCss = readFileSync(join(__dirname, "tokens.css"), "utf8");

function tokenHex(name: string): string {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`));
  if (!match) throw new Error(`--${name} is not a hex token in tokens.css`);
  return match[1];
}

const LIGHT_SURFACES = ["j-bg-primary", "j-ivory"];

describe("j-text-gold tokens meet WCAG AA on cream and ivory", () => {
  it.each(LIGHT_SURFACES)("j-text-gold reaches 4.5:1 on %s", (surface) => {
    expect(contrastRatio(tokenHex("j-text-gold"), tokenHex(surface))).toBeGreaterThanOrEqual(READABLE_CONTRAST);
  });

  it.each(LIGHT_SURFACES)("j-text-gold-lg reaches 3:1 on %s", (surface) => {
    expect(contrastRatio(tokenHex("j-text-gold-lg"), tokenHex(surface))).toBeGreaterThanOrEqual(3);
  });
});

const heroSource = readFileSync(join(__dirname, "../components/Hero/Hero.tsx"), "utf8");
const heroGradientEndStop = heroSource.match(/(#[0-9a-fA-F]{6}) 100%\)/)?.[1] ?? "";

describe("j-text-rose meets WCAG AA on cream and ivory", () => {
  it.each(LIGHT_SURFACES)("j-text-rose reaches 4.5:1 on %s", (surface) => {
    expect(contrastRatio(tokenHex("j-text-rose"), tokenHex(surface))).toBeGreaterThanOrEqual(READABLE_CONTRAST);
  });
});

describe("muted-on-warm tokens meet WCAG AA on warm surfaces", () => {
  it("finds the hero gradient end stop", () => {
    expect(heroGradientEndStop).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it.each([tokenHex("j-bg-section"), heroGradientEndStop])(
    "j-text-muted-warm reaches 4.5:1 on %s",
    (surface) => {
      expect(contrastRatio(tokenHex("j-text-muted-warm"), surface)).toBeGreaterThanOrEqual(READABLE_CONTRAST);
    },
  );

  it("email mutedOnWarm reaches 4.5:1 on the email warm background", () => {
    expect(contrastRatio(emailTokens.mutedOnWarm, emailTokens.warm)).toBeGreaterThanOrEqual(READABLE_CONTRAST);
  });

  it("email mutedOnWarm matches the web j-text-muted-warm token", () => {
    expect(emailTokens.mutedOnWarm.toLowerCase()).toBe(tokenHex("j-text-muted-warm").toLowerCase());
  });
});

describe("global-error inline styles", () => {
  it("colours the tag with the j-text-gold value", () => {
    const globalErrorSource = readFileSync(join(__dirname, "../app/global-error.tsx"), "utf8");
    const tagColor = globalErrorSource.match(/\.tag\s*\{[^}]*color:\s*(#[0-9a-fA-F]{6});/)?.[1];
    expect(tagColor?.toLowerCase()).toBe(tokenHex("j-text-gold").toLowerCase());
  });
});

describe("built-in theme colours match tokens.css", () => {
  it.each(Object.entries(COLOR_CONFIG))("%s", (key, config) => {
    const builtIn = BUILT_IN_THEME_COLORS[key as keyof typeof BUILT_IN_THEME_COLORS];
    expect(builtIn.toLowerCase()).toBe(tokenHex(config.semantic.slice(2)).toLowerCase());
  });
});
