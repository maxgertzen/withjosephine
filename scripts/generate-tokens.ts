/**
 * Build-time script: fetches the Sanity theme document and writes tokens.override.css
 * Run via: pnpm generate-tokens (or tsx scripts/generate-tokens.ts)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateEmailTokensModule,
  generateTokensCss,
} from "../src/lib/theme/generate-tokens";
import type { SanityTheme } from "../src/lib/sanity/types";
import { createSanityBuildClient } from "./lib/sanity-build-client";

async function fetchTheme(): Promise<SanityTheme | null> {
  const client = createSanityBuildClient();
  if (!client) {
    console.log("No NEXT_PUBLIC_SANITY_PROJECT_ID — using brand defaults");
    return null;
  }
  console.log("Fetching theme from Sanity...");
  return client.fetch<SanityTheme | null>(
    `*[_type == "theme"][0] { colors, displayFont, bodyFont }`,
  );
}

async function main() {
  const theme = await fetchTheme();

  const css = generateTokensCss(theme);
  if (css) {
    const cssPath = resolve(import.meta.dirname, "../src/styles/tokens.override.css");
    writeFileSync(cssPath, css + "\n", "utf-8");
    console.log(`Wrote ${cssPath}`);
  } else {
    console.log("No theme overrides found — skipping tokens.override.css");
  }

  // Email tokens always emit — transactional emails import from this file
  // and can't fall back to CSS variables. Defaults to brand values when
  // Sanity is unreachable or no theme document exists.
  const emailModule = generateEmailTokensModule(theme);
  const emailPath = resolve(
    import.meta.dirname,
    "../src/lib/theme/email-tokens.generated.ts",
  );
  writeFileSync(emailPath, emailModule + "\n", "utf-8");
  console.log(`Wrote ${emailPath}`);
}

main().catch((error) => {
  console.error("Failed to generate tokens:", error);
  process.exit(1);
});
