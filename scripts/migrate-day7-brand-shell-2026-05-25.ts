#!/usr/bin/env tsx
//
// Seed the 8 brand-shell fields onto the emailDay7Delivery singleton
// (brandName, brandSubtitle, heroLine, cardLabel, cardDeliveryLine,
// signOffLine1, signOffLine2, footerDisclaimer). Idempotent via
// setIfMissing — re-running does not overwrite editor changes.
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
      brandName: EMAIL_DAY7_DELIVERY_DEFAULTS.brandName,
      brandSubtitle: EMAIL_DAY7_DELIVERY_DEFAULTS.brandSubtitle,
      heroLine: EMAIL_DAY7_DELIVERY_DEFAULTS.heroLine,
      cardLabel: EMAIL_DAY7_DELIVERY_DEFAULTS.cardLabel,
      cardDeliveryLine: EMAIL_DAY7_DELIVERY_DEFAULTS.cardDeliveryLine,
      signOffLine1: EMAIL_DAY7_DELIVERY_DEFAULTS.signOffLine1,
      signOffLine2: EMAIL_DAY7_DELIVERY_DEFAULTS.signOffLine2,
      footerDisclaimer: EMAIL_DAY7_DELIVERY_DEFAULTS.footerDisclaimer,
    })
    .commit();

  console.log(`[migrate-day7-brand-shell] ${dataset} patched`);

  const post = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $id][0]{ brandName, brandSubtitle, heroLine, cardLabel, cardDeliveryLine, signOffLine1, signOffLine2, footerDisclaimer }`,
    { id: SINGLETON_ID },
  );
  console.log(`[migrate-day7-brand-shell] post-check:`, post);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
