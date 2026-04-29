// One-shot: smoke test caught Soul Blueprint at $129; spec says $179.
// Run with: pnpm tsx scripts/fix-soul-blueprint-price.mts
//
// Idempotent — safe to re-run; logs SKIP if value already correct.

import fs from "node:fs";

import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const TARGET_SLUG = "soul-blueprint";
const CORRECT_PRICE = 17900;
const CORRECT_DISPLAY = "$179";

type Reading = {
  _id: string;
  price?: number;
  priceDisplay?: string;
  slug?: { current: string };
};

const reading = await client.fetch<Reading | null>(
  `*[_type == "reading" && slug.current == $slug][0]{_id, price, priceDisplay, slug}`,
  { slug: TARGET_SLUG },
);

if (!reading) {
  console.error(`No reading found with slug "${TARGET_SLUG}"`);
  process.exit(1);
}

if (reading.price === CORRECT_PRICE && reading.priceDisplay === CORRECT_DISPLAY) {
  console.log(`SKIP ${reading._id} (price already ${CORRECT_DISPLAY})`);
  process.exit(0);
}

console.log(
  `PATCH ${reading._id}: price ${reading.price ?? "?"} → ${CORRECT_PRICE}, ` +
    `priceDisplay "${reading.priceDisplay ?? "?"}" → "${CORRECT_DISPLAY}"`,
);

await client
  .patch(reading._id)
  .set({ price: CORRECT_PRICE, priceDisplay: CORRECT_DISPLAY })
  .commit();

console.log("Done.");
