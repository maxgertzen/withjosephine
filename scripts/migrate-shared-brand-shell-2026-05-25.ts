#!/usr/bin/env tsx
//
// Seed the emailSharedShell singleton with EMAIL_SHARED_SHELL_DEFAULTS.
// Uses createIfNotExists so re-runs are no-ops and editor changes survive.
//
// Usage:
//   pnpm tsx scripts/migrate-shared-brand-shell-2026-05-25.ts staging
//   pnpm tsx scripts/migrate-shared-brand-shell-2026-05-25.ts production
//
// Env: reads .env.local for SANITY_WRITE_TOKEN + NEXT_PUBLIC_SANITY_PROJECT_ID.

import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

import { EMAIL_SHARED_SHELL_DEFAULTS } from "../src/data/defaults";
import { loadDotenv } from "./_lib/loadDotenv.mts";

const SANITY_API_VERSION = "2025-01-01";
const SINGLETON_ID = "emailSharedShell";

async function main(): Promise<void> {
  loadDotenv();
  const dataset = process.argv[2];
  if (dataset !== "staging" && dataset !== "production") {
    console.error(`Usage: pnpm tsx scripts/migrate-shared-brand-shell-2026-05-25.ts staging|production`);
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

  console.log(`[migrate-shared-brand-shell] dataset=${dataset}`);

  await client.createIfNotExists({
    _id: SINGLETON_ID,
    _type: "emailSharedShell",
    ...EMAIL_SHARED_SHELL_DEFAULTS,
  });

  // Backfill setIfMissing in case the doc exists but is empty (re-run safety).
  await client.patch(SINGLETON_ID).setIfMissing(EMAIL_SHARED_SHELL_DEFAULTS).commit();

  const post = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $id][0]{ brandName, brandSubtitle, signOffLine1, signOffLine2, footerDisclaimer }`,
    { id: SINGLETON_ID },
  );
  console.log(`[migrate-shared-brand-shell] post-check:`, post);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
