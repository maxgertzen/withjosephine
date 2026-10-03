#!/usr/bin/env tsx

import type { SanityClient } from "@sanity/client";

import {
  currentEmailFiredType,
  emailFiredTypeNeedle,
  LEGACY_EMAIL_FIRED_TYPES,
} from "../src/lib/booking/emailFiredType";

import { type D1Env, quoteSql, realExecD1 } from "./_lib/d1.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-reading-delivery-names";
const LEGACY_TEMPLATE_TYPE = "emailDay7Delivery";
const TEMPLATE_TYPE = "emailReadingDelivery";
const SANITY_SYSTEM_FIELDS = new Set(["_id", "_type", "_rev", "_createdAt", "_updatedAt"]);

const LEGACY_TYPES = [...LEGACY_EMAIL_FIRED_TYPES.keys()];
const typeNeedle = (type: string) => quoteSql(emailFiredTypeNeedle(type));

export function legacyEmailFiredSql(): { select: string; update: string } {
  const hasLegacy = LEGACY_TYPES.map((type) => `instr(emails_fired_json, ${typeNeedle(type)}) > 0`);
  const where = `WHERE ${hasLegacy.join(" OR ")}`;
  const rewritten = [...LEGACY_EMAIL_FIRED_TYPES].reduce(
    (column, [legacy, current]) => `replace(${column}, ${typeNeedle(legacy)}, ${typeNeedle(current)})`,
    "emails_fired_json",
  );
  return {
    select: `SELECT id FROM submissions ${where}`,
    update: `UPDATE submissions SET emails_fired_json = ${rewritten} ${where}`,
  };
}

type SubmissionWithLegacyEntries = {
  _id: string;
  _rev: string;
  legacyEntries: Array<{ _key?: string; type: string }>;
};

type SubmissionPatch = { _id: string; _rev: string; set: Record<string, string> };

export function planSubmissionPatches(docs: readonly SubmissionWithLegacyEntries[]): {
  patches: SubmissionPatch[];
  unaddressable: string[];
} {
  const patches: SubmissionPatch[] = [];
  const unaddressable: string[] = [];
  for (const doc of docs) {
    if (doc.legacyEntries.some((entry) => !entry._key)) {
      unaddressable.push(doc._id);
      continue;
    }
    const set = Object.fromEntries(
      doc.legacyEntries.map((entry) => [
        `emailsFired[_key=="${entry._key}"].type`,
        currentEmailFiredType(entry.type),
      ]),
    );
    patches.push({ _id: doc._id, _rev: doc._rev, set });
  }
  return { patches, unaddressable };
}

type TemplateDoc = { _id: string; _type: string } & Record<string, unknown>;

type TemplateMove = { fromId: string; copy: TemplateDoc };

export function planTemplateMoves(docs: readonly TemplateDoc[]): {
  moves: TemplateMove[];
  conflicts: string[];
} {
  const existingIds = new Set(docs.map((doc) => doc._id));
  const moves: TemplateMove[] = [];
  const conflicts: string[] = [];
  for (const doc of docs.filter((candidate) => candidate._type === LEGACY_TEMPLATE_TYPE)) {
    const toId = doc._id.replace(LEGACY_TEMPLATE_TYPE, TEMPLATE_TYPE);
    if (existingIds.has(toId)) {
      conflicts.push(`${doc._id} -> ${toId}`);
      continue;
    }
    const content = Object.fromEntries(
      Object.entries(doc).filter(([field]) => !SANITY_SYSTEM_FIELDS.has(field)),
    );
    moves.push({ fromId: doc._id, copy: { ...content, _id: toId, _type: TEMPLATE_TYPE } });
  }
  return { moves, conflicts };
}

const log = (message: string) => console.log(`[${LOG_PREFIX}] ${message}`);

function migrateD1(env: D1Env, apply: boolean): void {
  const sql = legacyEmailFiredSql();
  const rows = realExecD1<{ id: string }>({ env, sql: sql.select });
  log(`D1: ${rows.length} submissions with a legacy emails_fired_json type`);
  for (const row of rows) log(`D1: ${row.id}`);
  if (!apply || rows.length === 0) return;
  realExecD1({ env, sql: sql.update });
  const left = realExecD1<{ id: string }>({ env, sql: sql.select });
  log(`D1: rewritten, ${left.length} left`);
  if (left.length > 0) process.exitCode = 1;
}

async function migrateSubmissions(client: SanityClient, apply: boolean): Promise<void> {
  const docs = await client.fetch<SubmissionWithLegacyEntries[]>(
    `*[_type == "submission" && count(emailsFired[type in $legacyTypes]) > 0]{
      _id, _rev, "legacyEntries": emailsFired[type in $legacyTypes]{_key, type}
    }`,
    { legacyTypes: LEGACY_TYPES },
  );
  const { patches, unaddressable } = planSubmissionPatches(docs);
  log(`Sanity: ${docs.length} submissions with a legacy emailsFired type`);
  for (const id of unaddressable) log(`Sanity: ${id} has a legacy entry without _key, left alone`);
  if (unaddressable.length > 0) process.exitCode = 1;
  for (const patch of patches) log(`Sanity: ${patch._id} ${JSON.stringify(patch.set)}`);
  if (!apply) return;

  let failed = 0;
  for (const patch of patches) {
    try {
      await client.patch(patch._id).ifRevisionId(patch._rev).set(patch.set).commit();
    } catch (error) {
      failed += 1;
      log(`Sanity: ${patch._id} failed, rerun to retry (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  log(`Sanity: ${patches.length - failed} submissions patched, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

async function migrateTemplate(client: SanityClient, apply: boolean): Promise<void> {
  const docs = await client.fetch<TemplateDoc[]>(`*[_type in $types]`, {
    types: [LEGACY_TEMPLATE_TYPE, TEMPLATE_TYPE],
  });
  const { moves, conflicts } = planTemplateMoves(docs);
  for (const move of moves) log(`template: ${move.fromId} -> ${move.copy._id}`);
  for (const conflict of conflicts) log(`template: ${conflict} target exists, both left alone`);
  if (conflicts.length > 0) process.exitCode = 1;
  if (moves.length === 0) log("template: nothing to move");
  if (!apply) return;

  for (const move of moves) {
    await client.transaction().create(move.copy).delete(move.fromId).commit();
    log(`template: moved ${move.fromId} -> ${move.copy._id}`);
  }
}

async function run(opts: { dataset: D1Env; apply: boolean }): Promise<void> {
  log(`dataset=${opts.dataset} apply=${opts.apply}`);
  migrateD1(opts.dataset, opts.apply);
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  await migrateSubmissions(client, opts.apply);
  await migrateTemplate(client, opts.apply);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      "Usage: pnpm tsx scripts/migrate-reading-delivery-names-2026-10.mts staging|production [--apply]",
    );
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
