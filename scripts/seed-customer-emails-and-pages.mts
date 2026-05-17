import fs from "node:fs";
import { createClient } from "@sanity/client";

import {
  EMAIL_DAY2_STARTED_DEFAULTS,
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  LISTEN_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  MY_READINGS_PAGE_DEFAULTS,
} from "../src/data/defaults";

// Bootstraps the 7 customer-facing singletons under "Customer emails & pages"
// into the Sanity dataset using their code-side defaults. Without this, Studio
// renders "Untitled" in the editor pane H1 for any never-published singleton
// because `useValuePreview` short-circuits when `editState.draft/published`
// are both undefined (`preview.prepare` never runs).
//
// `createIfNotExists` is idempotent: re-runs are no-ops once Becky has the
// docs in her dataset; Becky's edits are never clobbered.
//
// Run: pnpm tsx scripts/seed-customer-emails-and-pages.mts <dataset>
// Default dataset: production. Use "staging" for the staging dataset.

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

// Strip null/undefined values — Sanity rejects null on typed fields. Editors
// can set signOff explicitly via Studio once the doc exists.
function omitNullish<T extends object>(record: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

const SEEDS = [
  { _id: "listenPage", _type: "listenPage", ...omitNullish(LISTEN_PAGE_DEFAULTS) },
  { _id: "myReadingsPage", _type: "myReadingsPage", ...omitNullish(MY_READINGS_PAGE_DEFAULTS) },
  {
    _id: "magicLinkVerifyPage",
    _type: "magicLinkVerifyPage",
    ...omitNullish(MAGIC_LINK_VERIFY_PAGE_DEFAULTS),
  },
  {
    _id: "emailOrderConfirmation",
    _type: "emailOrderConfirmation",
    ...omitNullish(EMAIL_ORDER_CONFIRMATION_DEFAULTS),
  },
  {
    _id: "emailDay2Started",
    _type: "emailDay2Started",
    ...omitNullish(EMAIL_DAY2_STARTED_DEFAULTS),
  },
  {
    _id: "emailDay7Delivery",
    _type: "emailDay7Delivery",
    ...omitNullish(EMAIL_DAY7_DELIVERY_DEFAULTS),
  },
  { _id: "emailMagicLink", _type: "emailMagicLink", ...omitNullish(EMAIL_MAGIC_LINK_DEFAULTS) },
];

for (const seed of SEEDS) {
  const result = await client.createIfNotExists(seed);
  const created = result._createdAt === result._updatedAt;
  console.log(
    `[${dataset}] ${seed._type}: ${created ? "created with defaults" : "already exists, no changes"}`,
  );
}

console.log(`[${dataset}] Seed complete.`);
