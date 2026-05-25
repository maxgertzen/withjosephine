#!/usr/bin/env tsx
//
// Seed the per-email brand-shell fields onto the emailDay7Delivery
// singleton (heroLine, cardLabel, cardDeliveryLine). Idempotent via
// setIfMissing — re-running does not overwrite editor changes.
//
// HISTORICAL NOTE: This script originally seeded 8 fields. The 5 that
// are now shell-shared (brandName, brandSubtitle, signOffLine1, signOffLine2,
// footerDisclaimer) moved to the emailSharedShell singleton in PR #193
// and are seeded by migrate-shared-brand-shell-2026-05-25.ts. This script
// retains only the per-email fields that remain on emailDay7Delivery.
//
// Usage:
//   pnpm tsx scripts/migrate-day7-brand-shell-2026-05-25.ts staging
//   pnpm tsx scripts/migrate-day7-brand-shell-2026-05-25.ts production
//
// Env: reads .env.local for SANITY_WRITE_TOKEN + NEXT_PUBLIC_SANITY_PROJECT_ID.

import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

import { EMAIL_DAY7_DELIVERY_DEFAULTS } from "../src/data/defaults";
import { loadDotenv } from "./_lib/loadDotenv.mts";

const SANITY_API_VERSION = "2025-01-01";
const SINGLETON_ID = "emailDay7Delivery";

async function main(): Promise<void> {
  loadDotenv();
  const dataset = process.argv[2];
  if (dataset !== "staging" && dataset !== "production") {
    console.error(`Usage: pnpm tsx scripts/migrate-day7-brand-shell-2026-05-25.ts staging|production`);
    process.exit(2);
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set");
  if (!token) throw new Error("SANITY_WRITE_TOKEN is not set");

  const client = createClient({
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token,
  });

  console.log(`[migrate-day7-brand-shell] dataset=${dataset}`);

  await client
    .patch(SINGLETON_ID)
    .setIfMissing({
      heroLine: EMAIL_DAY7_DELIVERY_DEFAULTS.heroLine,
      cardLabel: EMAIL_DAY7_DELIVERY_DEFAULTS.cardLabel,
      cardDeliveryLine: EMAIL_DAY7_DELIVERY_DEFAULTS.cardDeliveryLine,
    })
    .commit();

  console.log(`[migrate-day7-brand-shell] ${dataset} patched`);

  const post = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $id][0]{ heroLine, cardLabel, cardDeliveryLine }`,
    { id: SINGLETON_ID },
  );
  console.log(`[migrate-day7-brand-shell] post-check:`, post);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
