/**
 * Build-time script: fetches the Sanity theme document and writes tokens.override.css
 * Run via: pnpm generate-tokens (or tsx scripts/generate-tokens.ts)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@sanity/client";
import { generateTokensCss } from "../src/lib/theme/generate-tokens";
import type { SanityTheme } from "../src/lib/sanity/types";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    console.log("No NEXT_PUBLIC_SANITY_PROJECT_ID — skipping token generation");
    return;
  }

  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    useCdn: true,
  });

  console.log("Fetching theme from Sanity...");

  const theme = await client.fetch<SanityTheme | null>(
    `*[_type == "theme"][0] { colors, displayFont, bodyFont }`,
  );

  const css = generateTokensCss(theme);

  if (!css) {
    console.log("No theme overrides found — skipping tokens.override.css");
    return;
  }

  const outputPath = resolve(import.meta.dirname, "../src/styles/tokens.override.css");
  writeFileSync(outputPath, css + "\n", "utf-8");
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to generate tokens:", error);
  process.exit(1);
});
