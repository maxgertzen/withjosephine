#!/usr/bin/env tsx
//
// Repair submissions whose recipient_user_id resolves to a user whose
// email does NOT match recipient_email — the bb5fe157 corruption shape
// captured in MEMORY/project_recipient_user_id_corruption_mode.md and
// `MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md`
// Phase F.
//
// Production runs are HOLD-GATE per the source PRD's D-4: this session
// targets staging only; production cutover happens at main-merge time
// behind the additional --i-understand-this-is-production flag.
//
// Usage:
//   pnpm tsx scripts/repair-recipient-user-id.mts --env staging
//   pnpm tsx scripts/repair-recipient-user-id.mts --env staging --apply
//   pnpm tsx scripts/repair-recipient-user-id.mts --env production --apply --i-understand-this-is-production
//
// Env: reads .env.local for SANITY_WRITE_TOKEN + NEXT_PUBLIC_SANITY_PROJECT_ID.

import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient, type SanityClient } from "@sanity/client";
import { loadDotenv } from "./_lib/loadDotenv.mts";

const SANITY_API_VERSION = "2025-01-01";

const D1_DATABASE_BY_ENV = {
  staging: "withjosephine-bookings-staging",
  production: "withjosephine-bookings",
} as const;

const SANITY_DATASET_BY_ENV = {
  staging: "staging",
  production: "production",
} as const;

type Env = "staging" | "production";

type Args = {
  env: Env;
  apply: boolean;
  productionAck: boolean;
};

export type DetectorRow = {
  submission_id: string;
  recipient_email: string;
  purchaser_email: string | null;
  current_recipient_user_id: string;
  current_recipient_user_email: string | null;
  purchaser_user_id: string | null;
  gift_claimed_at: number | null;
  delivered_at: number | null;
};

export type ProposedAction = "update" | "create-then-update" | "ambiguous-skip";

export type ClassifiedRepair = {
  row: DetectorRow;
  proposed_action: ProposedAction;
  proposed_recipient_user_id: string | null;
  reason: string;
};

function parseArgs(argv: readonly string[]): Args {
  let env: Env | null = null;
  let apply = false;
  let productionAck = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--dry-run") apply = false;
    else if (arg === "--i-understand-this-is-production") productionAck = true;
    else if (arg === "--env") {
      const value = argv[++i];
      if (value !== "staging" && value !== "production") {
        console.error(`--env must be 'staging' or 'production'; got '${value}'`);
        process.exit(2);
      }
      env = value;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: repair-recipient-user-id.mts --env staging|production [--apply] [--i-understand-this-is-production]`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${arg}`);
      process.exit(2);
    }
  }
  if (!env) {
    console.error("--env is required (staging|production)");
    process.exit(2);
  }
  return { env, apply, productionAck };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailHash(email: string): string {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

function buildSanityClient(env: Env): SanityClient {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set in .env.local");
  if (!token) throw new Error("SANITY_WRITE_TOKEN is not set in .env.local");
  return createClient({
    projectId,
    dataset: SANITY_DATASET_BY_ENV[env],
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token,
  });
}

function execD1<T>(env: Env, sql: string): T[] {
  const dbName = D1_DATABASE_BY_ENV[env];
  const envFlags = env === "staging" ? ["--env", "staging"] : [];
  const wranglerArgs = ["exec", "wrangler", "d1", "execute", dbName, ...envFlags, "--remote", "--json", "--command", sql];
  const result = spawnSync("pnpm", wranglerArgs, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute failed against ${env}: ${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}

function quoteSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

const DETECTOR_SQL = `
SELECT s.id AS submission_id,
       s.email AS purchaser_email,
       s.recipient_email,
       s.recipient_user_id AS current_recipient_user_id,
       ru.email AS current_recipient_user_email,
       s.purchaser_user_id,
       s.gift_claimed_at,
       s.delivered_at
FROM submissions s
LEFT JOIN user ru ON ru.id = s.recipient_user_id
WHERE s.is_gift = 1
  AND s.recipient_user_id IS NOT NULL
  AND s.recipient_email IS NOT NULL
  AND (ru.email IS NULL OR LOWER(ru.email) != LOWER(s.recipient_email))
`.trim();

export function classifyRow(
  row: DetectorRow,
  userLookup: (normalizedEmail: string) => { id: string } | null,
): ClassifiedRepair {
  // ISC-B5a (delivered_at guard) was dropped 2026-05-25: it was meant to
  // protect spouse-forwarded-gift cases, but B5c (third-party-claim)
  // already covers those. delivered_at being set just means Day-7 cron
  // mirrored voice/PDF URLs — not proof that anyone listened.
  if (row.gift_claimed_at === null) {
    return {
      row,
      proposed_action: "ambiguous-skip",
      proposed_recipient_user_id: null,
      reason: "gift_claimed_at is null — pre-claim recipient_user_id is unexpected [ISC-B5b]",
    };
  }

  const normalizedRecipient = normalizeEmail(row.recipient_email);
  const currentResolvedEmail = row.current_recipient_user_email
    ? normalizeEmail(row.current_recipient_user_email)
    : null;
  const purchaserEmail = row.purchaser_email ? normalizeEmail(row.purchaser_email) : null;

  const isBb5fe157Shape =
    currentResolvedEmail === purchaserEmail &&
    row.current_recipient_user_id === row.purchaser_user_id;
  const isOrphanFk = currentResolvedEmail === null;
  const isThirdPartyClaim = !isOrphanFk && !isBb5fe157Shape;

  if (isThirdPartyClaim) {
    return {
      row,
      proposed_action: "ambiguous-skip",
      proposed_recipient_user_id: null,
      reason: `current user email (${currentResolvedEmail}) is neither purchaser nor recipient — forwarded-gift suspected [ISC-B5c]`,
    };
  }

  const targetUser = userLookup(normalizedRecipient);
  if (!targetUser) {
    return {
      row,
      proposed_action: "create-then-update",
      proposed_recipient_user_id: null,
      reason: "no user row matches recipient_email; create then repoint",
    };
  }
  if (targetUser.id === row.current_recipient_user_id) {
    return {
      row,
      proposed_action: "ambiguous-skip",
      proposed_recipient_user_id: targetUser.id,
      reason: "target user already equals current recipient_user_id (no-op)",
    };
  }
  return {
    row,
    proposed_action: "update",
    proposed_recipient_user_id: targetUser.id,
    reason: "repoint recipient_user_id to existing user matching recipient_email",
  };
}

function buildUserLookup(env: Env): (normalizedEmail: string) => { id: string } | null {
  const cache = new Map<string, { id: string } | null>();
  return (normalizedEmail: string) => {
    if (cache.has(normalizedEmail)) return cache.get(normalizedEmail)!;
    const rows = execD1<{ id: string }>(
      env,
      `SELECT id FROM user WHERE email = ${quoteSql(normalizedEmail)} LIMIT 2`,
    );
    if (rows.length === 0) {
      cache.set(normalizedEmail, null);
      return null;
    }
    if (rows.length > 1) {
      cache.set(normalizedEmail, null);
      return null;
    }
    const result = { id: rows[0].id };
    cache.set(normalizedEmail, result);
    return result;
  };
}

function csvEscape(value: string | null): string {
  const safe = value ?? "";
  return `"${safe.replace(/"/g, '""')}"`;
}

function writeCsv(rows: readonly ClassifiedRepair[], path: string): void {
  const header = "submission_id,recipient_email,current_recipient_user_id,current_recipient_user_email,proposed_recipient_user_id,proposed_action,reason\n";
  const body = rows
    .map((r) =>
      [
        r.row.submission_id,
        r.row.recipient_email,
        r.row.current_recipient_user_id,
        r.row.current_recipient_user_email,
        r.proposed_recipient_user_id,
        r.proposed_action,
        r.reason,
      ].map(csvEscape).join(","),
    )
    .join("\n");
  fs.writeFileSync(path, header + body + "\n");
}

function insertAuditPending(env: Env, args: {
  id: string;
  submission_id: string;
  recipient_email_hash: string;
  old_recipient_user_id: string;
  new_recipient_user_id: string;
  proposed_action: "update" | "create-then-update";
  performed_by: string;
  started_at: number;
}): void {
  const sql = `INSERT INTO recipient_user_id_repair_log (
      id, submission_id, recipient_email_hash, old_recipient_user_id, new_recipient_user_id,
      proposed_action, status, performed_by, started_at
    ) VALUES (
      ${quoteSql(args.id)},
      ${quoteSql(args.submission_id)},
      ${quoteSql(args.recipient_email_hash)},
      ${quoteSql(args.old_recipient_user_id)},
      ${quoteSql(args.new_recipient_user_id)},
      ${quoteSql(args.proposed_action)},
      'pending',
      ${quoteSql(args.performed_by)},
      ${args.started_at}
    )`;
  execD1<unknown>(env, sql);
}

function updateAuditStatus(env: Env, auditId: string, status: "completed" | "mirror-failed" | "failed", failureReason: string | null, completedAt: number): void {
  const failureSql = failureReason ? quoteSql(failureReason) : "NULL";
  const sql = `UPDATE recipient_user_id_repair_log
    SET status = ${quoteSql(status)},
        failure_reason = ${failureSql},
        completed_at = ${completedAt}
    WHERE id = ${quoteSql(auditId)}`;
  execD1<unknown>(env, sql);
}

async function applyRepair(env: Env, sanity: SanityClient, classified: ClassifiedRepair): Promise<{ status: "completed" | "mirror-failed" | "failed"; reason: string | null }> {
  const auditId = crypto.randomUUID();
  const startedAt = Date.now();
  const performedBy = `repair-recipient-user-id@${env}`;
  const oldRecipientUserId = classified.row.current_recipient_user_id;

  try {
    let newRecipientUserId: string;
    if (classified.proposed_action === "create-then-update") {
      const candidateId = crypto.randomUUID();
      const now = Date.now();
      const upsertSql = `INSERT INTO user (id, email, name, created_at, updated_at)
        VALUES (${quoteSql(candidateId)}, ${quoteSql(normalizeEmail(classified.row.recipient_email))}, NULL, ${now}, ${now})
        ON CONFLICT(email) DO UPDATE SET id=id
        RETURNING id`;
      const rows = execD1<{ id: string }>(env, upsertSql);
      newRecipientUserId = rows[0]?.id ?? candidateId;
    } else if (classified.proposed_action === "update" && classified.proposed_recipient_user_id) {
      newRecipientUserId = classified.proposed_recipient_user_id;
    } else {
      return { status: "failed", reason: `unexpected proposed_action ${classified.proposed_action}` };
    }

    insertAuditPending(env, {
      id: auditId,
      submission_id: classified.row.submission_id,
      recipient_email_hash: emailHash(classified.row.recipient_email),
      old_recipient_user_id: oldRecipientUserId,
      new_recipient_user_id: newRecipientUserId,
      proposed_action: classified.proposed_action,
      performed_by: performedBy,
      started_at: startedAt,
    });

    execD1<unknown>(
      env,
      `UPDATE submissions SET recipient_user_id = ${quoteSql(newRecipientUserId)} WHERE id = ${quoteSql(classified.row.submission_id)}`,
    );

    try {
      await sanity.patch(classified.row.submission_id).set({ recipientUserId: newRecipientUserId }).commit();
    } catch (mirrorErr) {
      const reason = mirrorErr instanceof Error ? mirrorErr.message : String(mirrorErr);
      updateAuditStatus(env, auditId, "mirror-failed", reason, Date.now());
      return { status: "mirror-failed", reason };
    }

    updateAuditStatus(env, auditId, "completed", null, Date.now());
    return { status: "completed", reason: null };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    try {
      updateAuditStatus(env, auditId, "failed", reason, Date.now());
    } catch {
      // Audit-status update may itself fail (e.g., if insertAuditPending didn't
      // land). Surface the original error regardless.
    }
    return { status: "failed", reason };
  }
}

async function main(): Promise<void> {
  loadDotenv();
  const args = parseArgs(process.argv.slice(2));

  if (args.env === "production" && args.apply && !args.productionAck) {
    console.error("--apply against --env production requires --i-understand-this-is-production");
    process.exit(2);
  }

  console.log(`[repair-recipient-user-id] env=${args.env} mode=${args.apply ? "APPLY" : "DRY-RUN"}`);

  const detectorRows = execD1<DetectorRow>(args.env, DETECTOR_SQL);
  console.log(`[repair] detector returned ${detectorRows.length} row(s)`);

  const lookup = buildUserLookup(args.env);
  const classified = detectorRows.map((row) => classifyRow(row, lookup));

  const updates = classified.filter((r) => r.proposed_action === "update");
  const creates = classified.filter((r) => r.proposed_action === "create-then-update");
  const skips = classified.filter((r) => r.proposed_action === "ambiguous-skip");
  console.log(`[repair] update=${updates.length}  create-then-update=${creates.length}  ambiguous-skip=${skips.length}`);

  const csvPath = `/tmp/u2-u6-repair-${Date.now()}.csv`;
  writeCsv(classified, csvPath);
  console.log(`[repair] CSV written → ${csvPath}`);

  for (const c of classified) {
    console.log(`  ${c.proposed_action.padEnd(20)} ${c.row.submission_id}  recipient=${c.row.recipient_email}  current=${c.row.current_recipient_user_email ?? "(null)"}  →  ${c.proposed_recipient_user_id ?? "(create)"}  // ${c.reason}`);
  }

  if (!args.apply) {
    console.log(`[repair] DRY-RUN — no mutations performed. Review CSV then re-run with --apply.`);
    return;
  }

  let completed = 0;
  let mirrorFailed = 0;
  let failed = 0;
  const sanity = buildSanityClient(args.env);
  for (const candidate of classified) {
    if (candidate.proposed_action === "ambiguous-skip") continue;
    const result = await applyRepair(args.env, sanity, candidate);
    if (result.status === "completed") {
      completed += 1;
      console.log(`  [apply] ${candidate.row.submission_id}  OK`);
    } else if (result.status === "mirror-failed") {
      mirrorFailed += 1;
      console.warn(`  [apply] ${candidate.row.submission_id}  MIRROR-FAILED  ${result.reason}`);
    } else {
      failed += 1;
      console.error(`  [apply] ${candidate.row.submission_id}  FAILED  ${result.reason}`);
    }
  }
  console.log(`[repair] APPLY complete  completed=${completed}  mirror-failed=${mirrorFailed}  failed=${failed}`);
  if (failed > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
