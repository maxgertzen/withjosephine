#!/usr/bin/env tsx
// Generic dispatcher that consumes the typed Drift[] from
// audit-defaults-drift.mts and applies the canonical patch op per
// DriftKind. Dry-run by default; --apply gates the actual writes.
//
//   pnpm tsx scripts/reconcile-defaults.mts <staging|production>          # dry-run
//   pnpm tsx scripts/reconcile-defaults.mts <staging|production> --apply  # write
//
// Dispatch rules (intentionally narrow; widen as new shapes emerge):
//   missing-in-prod : setIfMissing(field = default)
//   drift           : set(field = default) ONLY when both values are strings
//                     and the prod value contains an em-dash (U+2014). Anything
//                     else needs human review and is reported, not patched.
//   extra-in-prod   : report only (preserves Becky-only extras)
//   shape-mismatch  : report only (refuses to coerce types)

import { AUDIT_TABLE, type Drift, diffSingleton } from "./audit-defaults-drift.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const EM_DASH = "—";

type Dataset = "staging" | "production";

function parseArgs(): { dataset: Dataset; apply: boolean } {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith("--"));
  const dataset = positional[0];
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      `[reconcile-defaults] dataset argument required.\n` +
        `Usage: pnpm tsx scripts/reconcile-defaults.mts <staging|production> [--apply]`,
    );
    process.exit(2);
  }
  return { dataset, apply: args.includes("--apply") };
}

type Outcome = "would-patch" | "patched" | "reported" | "refused";

function classify(drift: Drift): { outcome: Outcome; reason: string } {
  if (drift.kind === "missing-in-prod") {
    return { outcome: "would-patch", reason: "setIfMissing" };
  }
  if (drift.kind === "drift") {
    const isStringPair =
      typeof drift.prodValue === "string" && typeof drift.defaultValue === "string";
    if (!isStringPair) {
      return { outcome: "reported", reason: "non-string drift; needs human review" };
    }
    if (!(drift.prodValue as string).includes(EM_DASH)) {
      return { outcome: "reported", reason: "string drift without em-dash; needs human review" };
    }
    if ((drift.defaultValue as string).includes(EM_DASH)) {
      return { outcome: "refused", reason: "default contains em-dash; refusing to patch" };
    }
    return { outcome: "would-patch", reason: "set default (em-dash drift)" };
  }
  if (drift.kind === "extra-in-prod") {
    return { outcome: "reported", reason: "field exists in prod but not in defaults" };
  }
  return { outcome: "reported", reason: "shape-mismatch; refusing to coerce" };
}

async function main(): Promise<void> {
  loadDotenv();
  const { dataset, apply } = parseArgs();
  if (!apply) {
    console.log(`[reconcile-defaults] dataset=${dataset} mode=dry-run`);
  } else {
    console.log(`[reconcile-defaults] dataset=${dataset} mode=apply`);
    if (!process.env.SANITY_WRITE_TOKEN) {
      throw new Error("SANITY_WRITE_TOKEN is required for --apply");
    }
  }

  const client = sanityWriteClient({ dataset, readOnly: !apply });
  const docs = await Promise.all(
    AUDIT_TABLE.map((entry) =>
      client.fetch<(Record<string, unknown> & { _id: string }) | null>(
        `*[_type == $type][0]`,
        { type: entry.docType },
      ),
    ),
  );

  let patched = 0;
  let reported = 0;
  let refused = 0;

  for (let i = 0; i < AUDIT_TABLE.length; i += 1) {
    const entry = AUDIT_TABLE[i];
    const doc = docs[i];
    if (!doc) {
      console.log(`[skip] ${entry.docType}: no document in this dataset.`);
      continue;
    }
    const { drifts } = diffSingleton(entry, doc);
    if (drifts.length === 0) continue;

    const setIfMissing: Record<string, unknown> = {};
    const setFields: Record<string, unknown> = {};

    for (const drift of drifts) {
      const { outcome, reason } = classify(drift);
      const tag = `[${entry.docType}.${drift.field}]`;
      if (outcome === "reported") {
        console.log(`${tag} REPORT — ${reason}`);
        reported += 1;
        continue;
      }
      if (outcome === "refused") {
        console.warn(`${tag} REFUSE — ${reason}`);
        refused += 1;
        continue;
      }
      // would-patch
      if (drift.kind === "missing-in-prod") {
        setIfMissing[drift.field] = drift.defaultValue;
      } else {
        setFields[drift.field] = drift.defaultValue;
      }
      patched += 1;
      console.log(`${tag} ${apply ? "PATCH" : "WOULD-PATCH"} — ${reason}`);
    }

    if (!apply) continue;
    let patch = client.patch(doc._id);
    let hasOps = false;
    if (Object.keys(setIfMissing).length > 0) {
      patch = patch.setIfMissing(setIfMissing);
      hasOps = true;
    }
    if (Object.keys(setFields).length > 0) {
      patch = patch.set(setFields);
      hasOps = true;
    }
    if (hasOps) await patch.commit();
  }

  console.log(
    `[reconcile-defaults] summary: ${apply ? "patched" : "would-patch"}=${patched} reported=${reported} refused=${refused}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
