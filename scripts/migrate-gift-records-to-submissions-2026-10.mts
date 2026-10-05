#!/usr/bin/env tsx

import type { SanityClient } from "@sanity/client";

import { type D1Env, quoteSql, realExecD1 } from "./_lib/d1.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-gift-records-to-submissions";
const LEGACY_TYPE = "giftRecord";
const MIRRORED_GIFT_STATUSES = ["active", "redeemed", "cancelled"] as const;

const mirroredStatuses = MIRRORED_GIFT_STATUSES.map(quoteSql).join(", ");

export function mirroredGiftsSql(updatedAt: string): { select: string; touch: string } {
  const where = `WHERE status IN (${mirroredStatuses})`;
  return {
    select: `SELECT id, status FROM gift_codes ${where} ORDER BY id`,
    touch: `UPDATE gift_codes SET updated_at = ${quoteSql(updatedAt)} ${where}`,
  };
}

export function followUpCommand(dataset: D1Env): string {
  const prodFlag = dataset === "production" ? " --prod" : "";
  return `bash scripts/force-cron.sh reconcile-mirror -${prodFlag}`;
}

type RevisionedDoc = { _id: string; _rev: string };

const log = (message: string) => console.log(`[${LOG_PREFIX}] ${message}`);

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function applyEach(
  ids: readonly string[],
  label: string,
  write: (id: string) => Promise<unknown>,
): Promise<void> {
  let failed = 0;
  for (const id of ids) {
    try {
      await write(id);
    } catch (error) {
      failed += 1;
      log(`Sanity: ${id} failed, rerun to retry (${errorText(error)})`);
    }
  }
  log(`Sanity: ${ids.length - failed} ${label}, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

async function unsetGiftRecordRefs(client: SanityClient, apply: boolean): Promise<void> {
  const docs = await client.fetch<RevisionedDoc[]>(
    `*[_type == "submission" && defined(gift.${LEGACY_TYPE})]{ _id, _rev }`,
  );
  log(`Sanity: ${docs.length} submissions with gift.${LEGACY_TYPE}`);
  for (const doc of docs) log(`Sanity: ${doc._id}`);
  if (!apply) return;
  const revisions = new Map(docs.map((doc) => [doc._id, doc._rev]));
  await applyEach([...revisions.keys()], "references removed", (id) =>
    client
      .patch(id)
      .ifRevisionId(revisions.get(id)!)
      .unset([`gift.${LEGACY_TYPE}`])
      .commit(),
  );
}

async function deleteGiftRecords(client: SanityClient, apply: boolean): Promise<void> {
  const ids = await client.fetch<string[]>(`*[_type == $type]._id`, { type: LEGACY_TYPE });
  log(`Sanity: ${ids.length} ${LEGACY_TYPE} docs`);
  for (const id of ids) log(`Sanity: ${id}`);
  if (!apply) return;
  await applyEach(ids, `${LEGACY_TYPE} docs deleted`, (id) => client.delete(id));
}

function touchMirroredGifts(env: D1Env, apply: boolean): void {
  const sql = mirroredGiftsSql(new Date().toISOString());
  const rows = realExecD1<{ id: string; status: string }>({ env, sql: sql.select });
  log(`D1: ${rows.length} gifts in ${MIRRORED_GIFT_STATUSES.join(", ")}`);
  for (const row of rows) log(`D1: ${row.id} ${row.status}`);
  if (!apply || rows.length === 0) return;
  realExecD1({ env, sql: sql.touch });
  log(`D1: updated_at touched on ${rows.length} gifts`);
}

async function run(opts: { dataset: D1Env; apply: boolean }): Promise<void> {
  log(`dataset=${opts.dataset} apply=${opts.apply}`);
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  await unsetGiftRecordRefs(client, opts.apply);
  await deleteGiftRecords(client, opts.apply);
  touchMirroredGifts(opts.dataset, opts.apply);
  if (opts.apply) log(`next: ${followUpCommand(opts.dataset)}`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      "Usage: pnpm tsx scripts/migrate-gift-records-to-submissions-2026-10.mts staging|production [--apply]",
    );
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
