import fs from "node:fs";
import { createClient, type SanityClient } from "@sanity/client";
import {
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
} from "../src/data/defaults";

// One-shot backfill for the v1.2.1 body-consolidation migration that never
// reached production. Four pre-existing email singletons sit in the
// production dataset with the body-class fields unset; Sanity Studio renders
// each as an empty editor and Becky has nothing to edit.
//
// `setIfMissing` only sets a field when it's currently absent on the document,
// so any prior editor work is never clobbered. Safe to re-run.
//
// Backfill plan (schema-aware — each singleton's body fields differ):
//   emailOrderConfirmation        → body (PT array)
//   emailDay7Delivery             → bodyIntro + bodyPostButton (PT arrays)
//   emailRecipientIntakeReceived  → body (PT array)
//   emailPrivacyExport            → bodyIntro + bodyPostButton (PT arrays)
//
// Run: pnpm tsx scripts/backfill-empty-email-bodies-2026-05-25.mts <dataset>

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2];
if (dataset !== "staging" && dataset !== "production") {
  console.error("Usage: pnpm tsx scripts/backfill-empty-email-bodies-2026-05-25.mts <staging|production>");
  process.exit(2);
}

const client: SanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

interface BackfillTarget {
  id: string;
  fields: Record<string, unknown>;
}

const TARGETS: BackfillTarget[] = [
  {
    id: "emailOrderConfirmation",
    fields: { body: EMAIL_ORDER_CONFIRMATION_DEFAULTS.body },
  },
  {
    id: "emailDay7Delivery",
    fields: {
      bodyIntro: EMAIL_DAY7_DELIVERY_DEFAULTS.bodyIntro,
      bodyPostButton: EMAIL_DAY7_DELIVERY_DEFAULTS.bodyPostButton,
    },
  },
  {
    id: "emailRecipientIntakeReceived",
    fields: { body: EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS.body },
  },
  {
    id: "emailPrivacyExport",
    fields: {
      bodyIntro: EMAIL_PRIVACY_EXPORT_DEFAULTS.bodyIntro,
      bodyPostButton: EMAIL_PRIVACY_EXPORT_DEFAULTS.bodyPostButton,
    },
  },
];

console.log(`[${dataset}] backfilling body-class fields on ${TARGETS.length} email singletons (setIfMissing)…`);

for (const { id, fields } of TARGETS) {
  const doc = (await client.getDocument(id)) as Record<string, unknown> | null;
  if (!doc) {
    console.log(`[${dataset}] ${id}: document does not exist, skipping`);
    continue;
  }
  const setIfMissing: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(fields)) {
    const current = doc[field];
    if (Array.isArray(current) && current.length > 0) {
      continue;
    }
    setIfMissing[field] = value;
  }
  if (Object.keys(setIfMissing).length === 0) {
    console.log(`[${dataset}] ${id}: all fields already populated, skipping`);
    continue;
  }
  await client.patch(id).setIfMissing(setIfMissing).commit();
  console.log(`[${dataset}] ${id}: backfilled ${Object.keys(setIfMissing).join(", ")}`);
}

console.log(`[${dataset}] Backfill complete.`);
