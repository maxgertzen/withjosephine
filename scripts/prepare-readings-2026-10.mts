import { getPublishedId, isDraftId } from "@sanity/client/csm";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

type ReadingRow = { _id: string; name: string; orderRank: string | null; onSite: boolean | null };

const READINGS_QUERY = `*[_type == "reading" && !(_id in path("versions.**"))] | order(order asc, name asc) { _id, name, orderRank, onSite }`;

const MAX_RANKED_READINGS = 35;

export function initialRank(index: number): string {
  return `0|${(index + 1).toString(36).padEnd(6, "0")}:`;
}

export function readingPatches(readings: ReadingRow[]): Map<string, Record<string, unknown>> {
  const published = readings.filter((reading) => !isDraftId(reading._id));
  const ranked = published.filter((reading) => reading.orderRank);
  if (ranked.length > 0 && ranked.length < published.length) {
    throw new Error("some readings already have a rank. Use Reset Order in the Studio Readings list.");
  }
  if (ranked.length === 0 && published.length > MAX_RANKED_READINGS) {
    throw new Error(`more than ${MAX_RANKED_READINGS} readings. Use Reset Order in the Studio Readings list.`);
  }

  const patches = new Map<string, Record<string, unknown>>();
  const add = (id: string, set: Record<string, unknown>) => patches.set(id, { ...patches.get(id), ...set });
  const rankById = new Map(published.map((reading, index) => [reading._id, reading.orderRank ?? initialRank(index)]));
  readings
    .filter((reading) => !reading.orderRank)
    .forEach((reading) => {
      const orderRank = rankById.get(getPublishedId(reading._id));
      if (orderRank) add(reading._id, { orderRank });
    });
  readings
    .filter((reading) => reading.onSite === null)
    .forEach((reading) => add(reading._id, { onSite: true }));
  return patches;
}

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const readings = await client.fetch<ReadingRow[]>(READINGS_QUERY);

  const patches = readingPatches(readings);
  if (patches.size === 0) {
    console.log(`[${opts.dataset}] every reading already has a rank and a "Show on the site" value.`);
    return;
  }

  const transaction = client.transaction();
  for (const [id, set] of patches) {
    console.log(`[${opts.dataset}] ${opts.apply ? "setting" : "would set"} ${id}: ${JSON.stringify(set)}`);
    transaction.patch(id, { set });
  }
  if (!opts.apply) return;

  await transaction.commit();
  console.log(`[${opts.dataset}] updated ${patches.size} readings.`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error("Usage: pnpm tsx scripts/prepare-readings-2026-10.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
