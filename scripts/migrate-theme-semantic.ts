/**
 * One-time migration: converts the Sanity theme document from palette-name
 * fields (midnight, gold, cream, etc.) to semantic fields (bgDark, accent,
 * bgPrimary, etc.) with @sanity/color-input object format.
 *
 * Run via: tsx scripts/migrate-theme-semantic.ts
 *
 * Safe to run multiple times — uses createOrReplace on the same _id.
 */
import { createClient } from "@sanity/client";

const PALETTE_TO_SEMANTIC: Record<string, string> = {
  cream: "bgPrimary",
  warm: "bgSection",
  midnight: "bgDark",
  deep: "bgInteractive",
  text: "textPrimary",
  gold: "accent",
  goldLight: "accentLight",
  muted: "textMuted",
  ivory: "ivory",
  blush: "blush",
  rose: "rose",
};

const EXTRA_SEMANTIC_DEFAULTS: Record<string, string> = {
  textHeading: "#0D0B1A",
  textOnDark: "#FAF8F4",
};

function toColorObject(hex: string) {
  return { _type: "color", hex, alpha: 1 };
}

async function migrate() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID");
    process.exit(1);
  }

  const client = createClient({
    projectId,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2024-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
  });

  console.log("Fetching existing theme document...");

  type OldTheme = {
    _id: string;
    _type: string;
    colors?: Record<string, string>;
    displayFont?: string;
    bodyFont?: string;
  };

  const existing = await client.fetch<OldTheme | null>(
    `*[_type == "theme"][0]`
  );

  if (!existing) {
    console.log("No theme document found — run seed-sanity.ts first");
    return;
  }

  const oldColors = existing.colors ?? {};
  const newColors: Record<string, { _type: string; hex: string; alpha: number }> = {};

  for (const [paletteKey, semanticKey] of Object.entries(PALETTE_TO_SEMANTIC)) {
    const hex = oldColors[paletteKey];
    if (hex) {
      newColors[semanticKey] = toColorObject(hex);
    }
  }

  for (const [semanticKey, defaultHex] of Object.entries(EXTRA_SEMANTIC_DEFAULTS)) {
    if (!newColors[semanticKey]) {
      newColors[semanticKey] = toColorObject(defaultHex);
    }
  }

  console.log("Migrating theme to semantic fields...");
  console.log("Field mapping:");
  for (const [palette, semantic] of Object.entries(PALETTE_TO_SEMANTIC)) {
    const hex = oldColors[palette] ?? "(missing)";
    console.log(`  ${palette} → ${semantic}: ${hex}`);
  }

  await client.createOrReplace({
    _id: existing._id,
    _type: "theme",
    colors: newColors,
    displayFont: existing.displayFont ?? "Cormorant Garamond",
    bodyFont: existing.bodyFont ?? "Inter",
  });

  console.log("Migration complete.");
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
