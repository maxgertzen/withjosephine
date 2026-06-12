#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-strip-title-articles";

const ARTICLE_PREFIX_RE = /^(the|a|an)\s+(.+)$/i;

// A historically-stored Day-7 subject that bakes "reading" into the template.
// When readingName = "Birth Chart Reading", this produces "...Reading reading..."
const DAY7_DOUBLE_NOUN_SUBJECT = "Your {readingName} reading is ready";
const DAY7_CLEAN_SUBJECT = "Your {readingName} is ready";

export function stripLeadingArticle(name: string): string | null {
  let current = name;
  let stripped = false;
  for (let match = ARTICLE_PREFIX_RE.exec(current); match; match = ARTICLE_PREFIX_RE.exec(current)) {
    current = match[2].trim();
    stripped = true;
  }
  return stripped ? current : null;
}

export type ReadingDoc = {
  _id: string;
  name: string;
};

export type PatchResult = {
  _id: string;
  oldName: string;
  newName: string;
  action: "patched" | "skipped";
};

export async function run(opts: {
  dataset: string;
  dryRun: boolean;
}): Promise<{ readings: PatchResult[]; day7SubjectPatched: boolean }> {
  const client = sanityWriteClient({ dataset: opts.dataset, readOnly: opts.dryRun });
  console.log(`[${LOG_PREFIX}] dataset=${opts.dataset} dryRun=${opts.dryRun}`);

  const docs = await client.fetch<ReadingDoc[]>(
    `*[_type == "reading"]{_id, name}`,
  );

  const results: PatchResult[] = [];

  for (const doc of docs) {
    const stripped = stripLeadingArticle(doc.name);
    if (stripped === null) {
      console.log(`[${LOG_PREFIX}] reading ${doc._id} name="${doc.name}" — clean, skip`);
      results.push({ _id: doc._id, oldName: doc.name, newName: doc.name, action: "skipped" });
      continue;
    }

    console.log(
      `[${LOG_PREFIX}] reading ${doc._id} name="${doc.name}" → "${stripped}"${opts.dryRun ? " (dry-run)" : ""}`,
    );

    if (!opts.dryRun) {
      await client.patch(doc._id).set({ name: stripped }).commit();
    }

    results.push({ _id: doc._id, oldName: doc.name, newName: stripped, action: "patched" });
  }

  const readingsPatched = results.filter((r) => r.action === "patched").length;
  console.log(
    `[${LOG_PREFIX}] readings: ${readingsPatched} patched, ${results.length - readingsPatched} skipped` +
      (opts.dryRun ? " (dry-run)" : ""),
  );

  let day7SubjectPatched = false;
  const day7 = await client.fetch<{ _id: string; subjectTemplate?: string } | null>(
    `*[_type == "emailDay7Delivery"][0]{_id, subjectTemplate}`,
  );

  if (!day7) {
    console.log(`[${LOG_PREFIX}] emailDay7Delivery: no singleton found, skipping`);
  } else if (day7.subjectTemplate === DAY7_DOUBLE_NOUN_SUBJECT) {
    console.log(
      `[${LOG_PREFIX}] emailDay7Delivery: subjectTemplate="${day7.subjectTemplate}" → "${DAY7_CLEAN_SUBJECT}"${opts.dryRun ? " (dry-run)" : ""}`,
    );
    if (!opts.dryRun) {
      await client.patch(day7._id).set({ subjectTemplate: DAY7_CLEAN_SUBJECT }).commit();
    }
    day7SubjectPatched = true;
  } else {
    console.log(
      `[${LOG_PREFIX}] emailDay7Delivery: subjectTemplate="${day7.subjectTemplate ?? "(unset)"}" does not match double-noun pattern, skipping`,
    );
  }

  console.log(`[${LOG_PREFIX}] complete`);

  return { readings: results, day7SubjectPatched };
}

async function main(): Promise<void> {
  loadDotenv();

  const args = process.argv.slice(2);
  const dataset = args[0];
  const dryRun = args[1] !== "--apply";

  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      `Usage: pnpm tsx scripts/migrate-strip-title-articles-2026-06-12.ts staging|production [--apply]`,
    );
    console.error(`  Default is dry-run. Pass --apply to write changes.`);
    process.exit(2);
  }

  await run({ dataset, dryRun });
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
