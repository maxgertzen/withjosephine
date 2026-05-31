import fs from "node:fs";
import { createClient } from "@sanity/client";

// One-off mutation script to repair the Sanity theme document where
// blush / ivory / rose color fields ended up stored as recursively-nested
// shapes ({_type:"color", hex:{hex:{hex:{hex:"#…"}}}}) — likely from a
// re-save loop in the Studio colorInput plugin.
//
// PR #213 added defensive extractHex to the build-time generator so the
// rendered CSS is correct regardless, but the data itself is still
// misshapen and noisy in Studio.
//
// Idempotent: re-runs against an already-flat shape are no-ops.
//
// Run: pnpm tsx scripts/repair-theme-color-shape-2026-05-31.ts <dataset>
// Default dataset: staging. Use "production" for the prod dataset.

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "staging";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const TARGET_KEYS = ["blush", "ivory", "rose"] as const;

function extractHex(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.startsWith("#") ? value : undefined;
  }
  if (value && typeof value === "object" && "hex" in value) {
    return extractHex((value as { hex: unknown }).hex);
  }
  return undefined;
}

async function main(): Promise<void> {
  console.log(`[repair-theme-color-shape] dataset=${dataset}`);

  const theme = await client.fetch<{
    _id: string;
    colors?: Record<string, { _type?: string; hex?: unknown; alpha?: number }>;
  } | null>(`*[_type == "theme"][0]{_id, colors}`);

  if (!theme) {
    console.warn(`[skip] no theme singleton in dataset ${dataset}.`);
    return;
  }

  let repaired = 0;
  let alreadyFlat = 0;
  let missing = 0;

  for (const key of TARGET_KEYS) {
    const color = theme.colors?.[key];
    if (!color) {
      console.log(`[${key}] missing — skipping.`);
      missing += 1;
      continue;
    }
    if (typeof color.hex === "string") {
      console.log(`[${key}] already flat (${color.hex}) — skipping.`);
      alreadyFlat += 1;
      continue;
    }
    const extracted = extractHex(color.hex);
    if (!extracted) {
      console.warn(
        `[${key}] could not extract a hex string from shape ${JSON.stringify(color.hex)} — skipping.`,
      );
      continue;
    }
    await client
      .patch(theme._id)
      .set({ [`colors.${key}.hex`]: extracted })
      .commit();
    console.log(`[${key}] repaired: nested → ${extracted}`);
    repaired += 1;
  }

  console.log(
    `[${dataset}] done. repaired=${repaired} alreadyFlat=${alreadyFlat} missing=${missing}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
