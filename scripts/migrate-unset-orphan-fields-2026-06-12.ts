#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-unset-orphan-fields";

const TARGET_ID = "emailOrderConfirmation";
const TARGET_TYPE = "emailOrderConfirmation";

const ORPHAN_FIELDS = ["contactLine", "greeting", "thanksLine", "timelineLine"] as const;

type OrphanDoc = {
  _id: string;
  _type: string;
} & Partial<Record<(typeof ORPHAN_FIELDS)[number], unknown>>;

export type OrphanUnsetResult = {
  action: "unset" | "skipped";
  fieldsFound: string[];
};

export async function run(opts: {
  dataset: string;
  dryRun: boolean;
}): Promise<OrphanUnsetResult> {
  const client = sanityWriteClient({ dataset: opts.dataset, readOnly: opts.dryRun });
  console.log(`[${LOG_PREFIX}] dataset=${opts.dataset} dryRun=${opts.dryRun}`);

  const doc = await client.fetch<OrphanDoc | null>(
    `*[_id == $id][0]{_id, _type, ${ORPHAN_FIELDS.join(", ")}}`,
    { id: TARGET_ID },
  );

  if (!doc) {
    console.log(`[${LOG_PREFIX}] ${TARGET_ID}: not found, skipping`);
    return { action: "skipped", fieldsFound: [] };
  }

  if (doc._type !== TARGET_TYPE) {
    console.log(
      `[${LOG_PREFIX}] ${TARGET_ID}: _type="${doc._type}" does not match "${TARGET_TYPE}", skipping`,
    );
    return { action: "skipped", fieldsFound: [] };
  }

  const fieldsFound = ORPHAN_FIELDS.filter((field) => {
    const value = doc[field];
    return value !== undefined && value !== null;
  });

  if (fieldsFound.length === 0) {
    console.log(`[${LOG_PREFIX}] ${TARGET_ID}: no orphan fields present, skipping`);
    return { action: "skipped", fieldsFound: [] };
  }

  console.log(
    `[${LOG_PREFIX}] ${TARGET_ID}: unsetting [${fieldsFound.join(", ")}]${opts.dryRun ? " (dry-run)" : ""}`,
  );

  if (!opts.dryRun) {
    await client.patch(TARGET_ID).unset(fieldsFound).commit();
  }

  console.log(`[${LOG_PREFIX}] complete`);

  return { action: "unset", fieldsFound };
}

async function main(): Promise<void> {
  loadDotenv();

  const args = process.argv.slice(2);
  const dataset = args[0];
  const dryRun = args[1] !== "--apply";

  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      `Usage: pnpm tsx scripts/migrate-unset-orphan-fields-2026-06-12.ts staging|production [--apply]`,
    );
    console.error(`  Default is dry-run. Pass --apply to write changes.`);
    process.exit(2);
  }

  await run({ dataset, dryRun });
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
