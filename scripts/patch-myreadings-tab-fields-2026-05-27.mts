// One-off patch: backfill Phase 2 fields on the `myReadingsPage` Sanity singleton
// where the doc pre-existed the schema additions (createIfNotExists no-ops on
// existing docs; the new fields landed as null). Read merge in loadLibraryData
// spreads null over defaults so the tab labels render empty.
//
// Surgical fix uses `setIfMissing` so existing edits by Becky are never clobbered;
// only fields that are currently null/undefined receive the default value.
//
// Run: pnpm tsx scripts/patch-myreadings-tab-fields-2026-05-27.mts <dataset>
// Default dataset: production. Use "staging" for staging.

import fs from "node:fs";
import { createClient } from "@sanity/client";

import { MY_READINGS_PAGE_DEFAULTS } from "../src/data/defaults";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "production";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const PHASE2_FIELDS = [
  "readingsTabLabel",
  "giftsTabLabel",
  "welcomeHeading",
  "welcomeSubhead",
  "welcomeButtonLabel",
] as const;

const setIfMissing: Record<string, string> = {};
for (const field of PHASE2_FIELDS) {
  const value = MY_READINGS_PAGE_DEFAULTS[field];
  if (typeof value === "string") {
    setIfMissing[field] = value;
  }
}

console.log(`[${dataset}] patching myReadingsPage singleton, setIfMissing:`, setIfMissing);
const result = await client
  .patch("myReadingsPage")
  .setIfMissing(setIfMissing)
  .commit();
console.log(`[${dataset}] patched: rev=${result._rev}`);
