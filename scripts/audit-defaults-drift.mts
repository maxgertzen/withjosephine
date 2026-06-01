#!/usr/bin/env tsx
// Read-only diff of in-code defaults (src/data/defaults.ts) vs the live
// Sanity document for each registered singleton. Does NOT mutate Sanity.

import { fileURLToPath } from "node:url";

import {
  ENTRY_PAGE_DEFAULTS,
  GIFT_CLAIM_PAGE_DEFAULTS,
  GIFT_INTAKE_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  MY_GIFTS_PAGE_DEFAULTS,
  MY_READINGS_PAGE_DEFAULTS,
  NOT_FOUND_PAGE_DEFAULTS,
  UNDER_CONSTRUCTION_PAGE_DEFAULTS,
} from "../src/data/defaults";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

type Dataset = "staging" | "production";

type AuditEntry = {
  docType: string;
  defaults: Readonly<Record<string, unknown>>;
};

// Flat-ish singletons where every scalar field maps 1:1 to a default. Nested
// landingPage / siteSettings / theme / form schemas are skipped: their shape
// is composed and needs a per-section walker rather than a property scan.
function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

const AUDIT_TABLE: readonly AuditEntry[] = [
  { docType: "entryPage", defaults: asRecord(ENTRY_PAGE_DEFAULTS) },
  { docType: "myReadingsPage", defaults: asRecord(MY_READINGS_PAGE_DEFAULTS) },
  { docType: "myGiftsPage", defaults: asRecord(MY_GIFTS_PAGE_DEFAULTS) },
  { docType: "giftClaimPage", defaults: asRecord(GIFT_CLAIM_PAGE_DEFAULTS) },
  { docType: "giftIntakePage", defaults: asRecord(GIFT_INTAKE_PAGE_DEFAULTS) },
  { docType: "magicLinkVerifyPage", defaults: asRecord(MAGIC_LINK_VERIFY_PAGE_DEFAULTS) },
  { docType: "notFoundPage", defaults: asRecord(NOT_FOUND_PAGE_DEFAULTS) },
  { docType: "underConstructionPage", defaults: asRecord(UNDER_CONSTRUCTION_PAGE_DEFAULTS) },
];

function parseDataset(): Dataset {
  const arg = process.argv[2];
  if (arg !== "staging" && arg !== "production") {
    const received = arg === undefined ? "(no argument)" : `'${arg}'`;
    console.error(
      `[audit-defaults-drift] dataset argument required. Received ${received}.\n` +
        `Usage: pnpm tsx scripts/audit-defaults-drift.mts <staging|production>`,
    );
    process.exit(2);
  }
  return arg;
}

function isScalar(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function truncate(value: string, max = 80): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

type DriftKind = "missing-in-prod" | "drift" | "extra-in-prod" | "shape-mismatch";

type Drift = {
  docType: string;
  field: string;
  kind: DriftKind;
  defaultValue: unknown;
  prodValue: unknown;
};

function diffSingleton(entry: AuditEntry, doc: Record<string, unknown> | null): {
  scanned: number;
  drifts: Drift[];
} {
  if (!doc) {
    return { scanned: 0, drifts: [] };
  }
  const drifts: Drift[] = [];
  let scanned = 0;
  for (const [field, defaultValue] of Object.entries(entry.defaults)) {
    const prodValue = doc[field];
    if (isScalar(defaultValue)) {
      scanned += 1;
      if (prodValue === undefined || prodValue === null) {
        drifts.push({
          docType: entry.docType,
          field,
          kind: "missing-in-prod",
          defaultValue,
          prodValue,
        });
        continue;
      }
      if (!isScalar(prodValue)) {
        drifts.push({
          docType: entry.docType,
          field,
          kind: "shape-mismatch",
          defaultValue,
          prodValue,
        });
        continue;
      }
      if (prodValue !== defaultValue) {
        drifts.push({
          docType: entry.docType,
          field,
          kind: "drift",
          defaultValue,
          prodValue,
        });
      }
      continue;
    }
    // Default is non-scalar (object/array). Per-section walkers handle the
    // deep diff; here we only catch the loud case where prod stores a scalar
    // at the same key (real schema drift, not a missing walker).
    if (isScalar(prodValue)) {
      drifts.push({
        docType: entry.docType,
        field,
        kind: "shape-mismatch",
        defaultValue,
        prodValue,
      });
    }
  }
  for (const field of Object.keys(doc)) {
    if (field.startsWith("_")) continue;
    if (field in entry.defaults) continue;
    const prodValue = doc[field];
    if (!isScalar(prodValue)) continue;
    drifts.push({
      docType: entry.docType,
      field,
      kind: "extra-in-prod",
      defaultValue: undefined,
      prodValue,
    });
  }
  return { scanned, drifts };
}

async function main(): Promise<void> {
  loadDotenv();
  const dataset = parseDataset();
  const client = sanityWriteClient({ dataset, readOnly: true });

  console.log(`[audit-defaults-drift] dataset=${dataset} singletons=${AUDIT_TABLE.length}`);

  // Fetch all singleton docs in parallel; the audit doesn't depend on order
  // and Sanity API tolerates concurrent reads. Sequential await wasted ~1.5s
  // of wall-clock across 8 RTTs.
  const fetchedDocs = await Promise.all(
    AUDIT_TABLE.map((entry) =>
      client.fetch<Record<string, unknown> | null>(`*[_type == $type][0]`, {
        type: entry.docType,
      }),
    ),
  );

  let totalScanned = 0;
  let totalDrifts = 0;
  for (let i = 0; i < AUDIT_TABLE.length; i += 1) {
    const entry = AUDIT_TABLE[i];
    const doc = fetchedDocs[i];
    if (!doc) {
      console.log(`[audit] ${entry.docType}: no document in this dataset, skipping.`);
      continue;
    }
    const { scanned, drifts } = diffSingleton(entry, doc);
    totalScanned += scanned;
    if (drifts.length === 0) {
      console.log(`[OK]    ${entry.docType}: ${scanned} scalar field(s), no drift.`);
      continue;
    }
    totalDrifts += drifts.length;
    console.log(`[DRIFT] ${entry.docType}: ${drifts.length} drift(s) across ${scanned} scanned field(s).`);
    for (const drift of drifts) {
      const defaultRepr = drift.defaultValue === undefined ? "(absent)" : truncate(String(drift.defaultValue));
      const prodRepr = drift.prodValue === undefined ? "(absent)" : truncate(String(drift.prodValue));
      console.log(`  - [${drift.kind}] ${drift.field}`);
      console.log(`      default: ${defaultRepr}`);
      console.log(`      prod:    ${prodRepr}`);
    }
  }

  console.log(
    `[audit-defaults-drift] summary: scanned=${totalScanned} drifts=${totalDrifts}`,
  );
  if (totalDrifts > 0) process.exitCode = 1;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

export { AUDIT_TABLE, diffSingleton };
