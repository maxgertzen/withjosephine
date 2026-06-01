#!/usr/bin/env tsx
//
// Backfill orphan Sanity submissions misrouted to the production dataset
// during the 2026-05-25T04:39Z–07:00Z dataset-misrouting window
// (root-caused + fixed in PR #190).
//
// Approach:
//   1. GROQ production dataset for submissions in the misroute window.
//   2. For each candidate, confirm the row exists in the staging D1
//      database (a real orphan = exists in staging D1 + exists only in
//      production Sanity).
//   3. Skip candidates that ALSO exist in staging Sanity (cross-pollution
//      requires manual review — see ISC-A8a).
//   4. Dry-run prints + CSV. --apply creates on staging Sanity (preserving
//      _id), then deletes from production Sanity.
//
// Usage:
//   pnpm tsx scripts/backfill-misrouted-sanity-mirror.mts
//   pnpm tsx scripts/backfill-misrouted-sanity-mirror.mts --apply
//   pnpm tsx scripts/backfill-misrouted-sanity-mirror.mts --from 2026-05-25T04:39:00Z --to 2026-05-25T07:00:00Z
//
// Env: reads .env.local for SANITY_WRITE_TOKEN + NEXT_PUBLIC_SANITY_PROJECT_ID.

import { type SanityClient } from "@sanity/client";

import {
  SANDBOX_DOMAIN,
  SANDBOX_EMAIL_PREFIX_LIST,
} from "../src/lib/booking/sandboxEmails";

import { writeCsv } from "./_lib/csv.mts";
import { quoteSql, realExecD1 } from "./_lib/d1.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const DEFAULT_FROM = "2026-05-25T04:39:00Z";
const DEFAULT_TO = "2026-05-25T07:00:00Z";

function isSandboxEmail(address: string | null | undefined): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  if (!lower.endsWith(SANDBOX_DOMAIN)) return false;
  return SANDBOX_EMAIL_PREFIX_LIST.some((prefix) => lower.startsWith(prefix));
}

type Args = {
  apply: boolean;
  from: string;
  to: string;
};

type SanitySubmissionStub = {
  _id: string;
  _createdAt: string;
  recipientEmail?: string | null;
  email?: string | null;
};

type SanityDocWithSystemFields = {
  _id: string;
  _type: string;
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  [key: string]: unknown;
};

type D1SubmissionRow = {
  id: string;
  email: string | null;
  recipient_email: string | null;
};

type ClassifiedRow = {
  _id: string;
  _createdAt: string;
  recipient_email: string | null;
  purchaser_email: string | null;
  classification: "orphan" | "sandbox-residue" | "non-orphan-skip" | "cross-pollution-skip";
};

function parseArgs(argv: readonly string[]): Args {
  let apply = false;
  let from = DEFAULT_FROM;
  let to = DEFAULT_TO;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg === "--from") from = argv[++i] ?? from;
    else if (arg === "--to") to = argv[++i] ?? to;
    else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: backfill-misrouted-sanity-mirror.mts [--apply] [--from ISO] [--to ISO]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${arg}`);
      process.exit(2);
    }
  }
  return { apply, from, to };
}

function buildSanityClient(dataset: "production" | "staging"): SanityClient {
  return sanityWriteClient({ dataset });
}

function bulkQueryStagingD1(submissionIds: readonly string[]): Map<string, D1SubmissionRow> {
  const out = new Map<string, D1SubmissionRow>();
  if (submissionIds.length === 0) return out;
  const inList = submissionIds.map(quoteSql).join(",");
  const sql = `SELECT id, email, recipient_email FROM submissions WHERE id IN (${inList})`;
  const results = realExecD1<D1SubmissionRow>({ env: "staging", sql });
  for (const row of results) {
    out.set(row.id, row);
  }
  return out;
}

async function classifyCandidate(
  candidate: SanitySubmissionStub,
  d1Hits: Map<string, D1SubmissionRow>,
  stagingSanity: SanityClient,
): Promise<ClassifiedRow> {
  const d1Row = d1Hits.get(candidate._id);
  const purchaserEmail = d1Row?.email ?? candidate.email ?? null;
  const recipientEmail = d1Row?.recipient_email ?? candidate.recipientEmail ?? null;
  const isSandbox = isSandboxEmail(purchaserEmail) && isSandboxEmail(recipientEmail);

  // Sandbox-prefix rows in either branch are e2e residue. Staging-D1 cleanup
  // helpers handle their D1 side; production-Sanity needs explicit delete.
  // No staging mirror create — sandbox rows shouldn't pollute staging Studio.
  if (isSandbox) {
    return {
      _id: candidate._id,
      _createdAt: candidate._createdAt,
      recipient_email: recipientEmail,
      purchaser_email: purchaserEmail,
      classification: "sandbox-residue",
    };
  }
  if (!d1Row) {
    return {
      _id: candidate._id,
      _createdAt: candidate._createdAt,
      recipient_email: recipientEmail,
      purchaser_email: purchaserEmail,
      classification: "non-orphan-skip",
    };
  }
  const stagingDoc = await stagingSanity.getDocument(candidate._id);
  if (stagingDoc) {
    return {
      _id: candidate._id,
      _createdAt: candidate._createdAt,
      recipient_email: recipientEmail,
      purchaser_email: purchaserEmail,
      classification: "cross-pollution-skip",
    };
  }
  return {
    _id: candidate._id,
    _createdAt: candidate._createdAt,
    recipient_email: recipientEmail,
    purchaser_email: purchaserEmail,
    classification: "orphan",
  };
}

const CSV_COLUMNS = [
  { name: "_id", get: (r: ClassifiedRow) => r._id },
  { name: "_createdAt", get: (r: ClassifiedRow) => r._createdAt },
  { name: "recipient_email", get: (r: ClassifiedRow) => r.recipient_email },
  { name: "purchaser_email", get: (r: ClassifiedRow) => r.purchaser_email },
  { name: "classification", get: (r: ClassifiedRow) => r.classification },
] as const;

type ApplyResult =
  | { stage: "completed" }
  | { stage: "create-failed"; error: string }
  | { stage: "delete-failed"; error: string };

async function applyBackfillForOrphan(
  productionClient: SanityClient,
  stagingClient: SanityClient,
  orphanId: string,
): Promise<ApplyResult> {
  const fullDoc = (await productionClient.getDocument(orphanId)) as SanityDocWithSystemFields | null;
  if (!fullDoc) {
    return { stage: "create-failed", error: `production document ${orphanId} no longer exists` };
  }
  // _rev is server-managed; passing it to createOrReplace causes a 409.
  // _updatedAt is reset on every write. _createdAt is preserved so the
  // restored staging doc has the same creation timestamp as the prod orphan.
  const { _rev: _rev, _updatedAt: _updatedAt, ...docToWrite } = fullDoc;
  void _rev;
  void _updatedAt;
  try {
    await stagingClient.createOrReplace(docToWrite as SanityDocWithSystemFields);
  } catch (err) {
    return { stage: "create-failed", error: err instanceof Error ? err.message : String(err) };
  }
  try {
    await productionClient.delete(orphanId);
  } catch (err) {
    // Doc is now in BOTH datasets. Operator must manually delete from prod;
    // next dry-run will surface this as cross-pollution-skip until cleaned.
    return { stage: "delete-failed", error: err instanceof Error ? err.message : String(err) };
  }
  return { stage: "completed" };
}

async function main(): Promise<void> {
  loadDotenv();
  const args = parseArgs(process.argv.slice(2));

  console.log(`[backfill-misrouted-sanity-mirror] mode=${args.apply ? "APPLY" : "DRY-RUN"} from=${args.from} to=${args.to}`);

  const productionClient = buildSanityClient("production");
  const stagingClient = buildSanityClient("staging");

  const candidates = await productionClient.fetch<SanitySubmissionStub[]>(
    `*[_type == "submission" && _createdAt >= $from && _createdAt < $to]{ _id, _createdAt, recipientEmail, email } | order(_createdAt asc)`,
    { from: args.from, to: args.to },
  );

  console.log(`[backfill] ${candidates.length} production-Sanity submission(s) in window`);

  const d1Hits = bulkQueryStagingD1(candidates.map((c) => c._id));
  const classified = await Promise.all(
    candidates.map((candidate) => classifyCandidate(candidate, d1Hits, stagingClient)),
  );

  const orphans = classified.filter((r) => r.classification === "orphan");
  const residue = classified.filter((r) => r.classification === "sandbox-residue");
  const nonOrphans = classified.filter((r) => r.classification === "non-orphan-skip");
  const crossPollution = classified.filter((r) => r.classification === "cross-pollution-skip");

  console.log(`[backfill] orphan=${orphans.length}  sandbox-residue=${residue.length}  non-orphan-skip=${nonOrphans.length}  cross-pollution-skip=${crossPollution.length}`);

  const csvPath = `/tmp/orphan-backfill-${Date.now()}.csv`;
  writeCsv({ path: csvPath, rows: classified, columns: CSV_COLUMNS });
  console.log(`[backfill] CSV written → ${csvPath}`);

  for (const row of classified) {
    console.log(`  ${row.classification.padEnd(22)} ${row._id}  ${row._createdAt}  recipient=${row.recipient_email ?? "(null)"}  purchaser=${row.purchaser_email ?? "(null)"}`);
  }

  if (!args.apply) {
    console.log(`[backfill] DRY-RUN — no mutations performed. Review CSV then re-run with --apply.`);
    return;
  }

  if (crossPollution.length > 0) {
    console.error(`[backfill] REFUSING to apply: ${crossPollution.length} cross-pollution row(s) require manual review first.`);
    process.exit(1);
  }

  let completed = 0;
  let createFailed = 0;
  let deleteFailed = 0;
  for (const orphan of orphans) {
    const result = await applyBackfillForOrphan(productionClient, stagingClient, orphan._id);
    if (result.stage === "completed") {
      completed += 1;
      console.log(`  [apply] ${orphan._id}  OK  (created on staging, deleted from production)`);
    } else if (result.stage === "create-failed") {
      createFailed += 1;
      console.error(`  [apply] ${orphan._id}  CREATE-FAILED  ${result.error}`);
    } else {
      deleteFailed += 1;
      console.error(`  [apply] ${orphan._id}  DELETE-FAILED  ${result.error}  (now in BOTH datasets; manual prod delete required)`);
    }
  }

  let residueDeleted = 0;
  let residueFailed = 0;
  for (const r of residue) {
    try {
      await productionClient.delete(r._id);
      residueDeleted += 1;
      console.log(`  [apply-residue] ${r._id}  DELETED from production`);
    } catch (err) {
      residueFailed += 1;
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`  [apply-residue] ${r._id}  DELETE-FAILED  ${reason}`);
    }
  }

  console.log(`[backfill] APPLY complete  completed=${completed}  create-failed=${createFailed}  delete-failed=${deleteFailed}  residue-deleted=${residueDeleted}  residue-failed=${residueFailed}`);
  if (createFailed > 0 || deleteFailed > 0 || residueFailed > 0) process.exit(1);
}

if (isMainModule(import.meta.url)) {
  await main();
}
