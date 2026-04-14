/**
 * Build-time script: fetches the Sanity theme document and writes fonts.generated.ts
 * Run via: pnpm generate-fonts (or tsx scripts/generate-fonts.ts)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@sanity/client";
import { generateFontsModule } from "../src/lib/theme/generate-tokens";
import type { SanityTheme } from "../src/lib/sanity/types";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
});

async function main() {
  console.log("Fetching theme fonts from Sanity...");

  const theme = await client.fetch<SanityTheme | null>(
    `*[_type == "theme"][0] { displayFont, bodyFont }`
  );

  const module = generateFontsModule(theme);

  const outputPath = resolve(import.meta.dirname, "../src/lib/fonts.generated.ts");
  writeFileSync(outputPath, module + "\n", "utf-8");
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error("Failed to generate fonts:", error);
  process.exit(1);
});
