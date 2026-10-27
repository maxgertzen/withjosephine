import type { SanityClient } from "@sanity/client";

import { FORM_NAVIGATION_LABEL_KEYS } from "../src/components/IntakeForm/formNavigationLabels";
import { NOTES_DEFAULTS, READING_PAGE_DEFAULTS } from "../src/data/defaults";
import { pick } from "../src/lib/pick";
import { fillMissing, type FillMissingSeed } from "./_lib/fillMissing.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

const BOOKING_PAGE_WORDS = pick(READING_PAGE_DEFAULTS, ["backLabel", ...FORM_NAVIGATION_LABEL_KEYS]);
const NOTES_WORDS = pick(NOTES_DEFAULTS, ["readingPageTitle", "navLinkLabel", "footerLinkLabel"]);

type Row = { _id: string; values: Record<string, unknown> | null };

async function seedsFor(
  client: SanityClient,
  type: string,
  parent: string | undefined,
  words: Record<string, unknown>,
): Promise<FillMissingSeed[]> {
  const rows = await client.fetch<Row[]>(`*[_type == $type && !(_id in path("versions.**"))]{ _id, "values": ${parent ?? "@"} }`, { type });
  return rows.flatMap((row) => {
    const missing = Object.keys(words).filter((key) => row.values?.[key] == null);
    if (missing.length === 0) return [];
    const fields = Object.fromEntries(missing.map((key) => [parent ? `${parent}.${key}` : key, words[key]]));
    return [{ _id: row._id, fields, parent }];
  });
}

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const seeds = (
    await Promise.all([
      seedsFor(client, "bookingForm", "readingPageContent", BOOKING_PAGE_WORDS),
      seedsFor(client, "notesSettings", undefined, NOTES_WORDS),
    ])
  ).flat();

  if (seeds.length === 0) {
    console.log(`[${opts.dataset}] nothing to fill.`);
    return;
  }

  const transaction = client.transaction();
  for (const seed of seeds) {
    console.log(
      `[${opts.dataset}] ${opts.apply ? "filling" : "would fill"} ${seed._id}: ${Object.keys(seed.fields).join(", ")}`,
    );
    fillMissing(transaction, seed);
  }
  if (!opts.apply) return;

  await transaction.commit();
  console.log(`[${opts.dataset}] filled ${seeds.length} documents.`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error("Usage: pnpm tsx scripts/seed-booking-page-words-2026-10.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
