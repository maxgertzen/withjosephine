#!/usr/bin/env tsx
//
// Seed heroLine (+ buttonLabel on magic-link variants) onto the
// singletons that just adopted the brand shell: emailMagicLink,
// emailMagicLinkLibrary (formerly emailMagicLinkMyReadings), emailPrivacyExport.
// setIfMissing so editor changes survive re-runs.
//
// Usage:
//   pnpm tsx scripts/migrate-magiclink-privacy-hero-2026-05-25.ts staging
//   pnpm tsx scripts/migrate-magiclink-privacy-hero-2026-05-25.ts production
//
// Env: reads .env.local for SANITY_WRITE_TOKEN + NEXT_PUBLIC_SANITY_PROJECT_ID.

import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";

import {
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
} from "../src/data/defaults";
import { loadDotenv } from "./_lib/loadDotenv.mts";

const SANITY_API_VERSION = "2025-01-01";

const SEEDS = [
  {
    id: "emailMagicLink",
    fields: {
      heroLine: EMAIL_MAGIC_LINK_DEFAULTS.heroLine,
      buttonLabel: EMAIL_MAGIC_LINK_DEFAULTS.buttonLabel,
    },
  },
  {
    id: "emailPrivacyExport",
    fields: { heroLine: EMAIL_PRIVACY_EXPORT_DEFAULTS.heroLine },
  },
] as const;

async function main(): Promise<void> {
  loadDotenv();
  const dataset = process.argv[2];
  if (dataset !== "staging" && dataset !== "production") {
    console.error(`Usage: pnpm tsx scripts/migrate-magiclink-privacy-hero-2026-05-25.ts staging|production`);
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

  console.log(`[migrate-magiclink-privacy-hero] dataset=${dataset}`);

  for (const { id, fields } of SEEDS) {
    await client.patch(id).setIfMissing(fields).commit();
    console.log(`[migrate] ${id} setIfMissing ${JSON.stringify(fields)}`);
  }

  const summary = await client.fetch<unknown>(
    `*[_id in $ids]{ _id, heroLine, buttonLabel }`,
    { ids: SEEDS.map((s) => s.id) },
  );
  console.log(`[migrate] post-check:`, summary);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
