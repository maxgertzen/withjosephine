import { nonBlank } from "../src/lib/content/nonBlank";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

export type ReadingWords = {
  _id: string;
  valueProposition?: string | null;
  briefDescription?: string | null;
  summary?: { _key?: string | null; promise?: string | null; description?: string | null } | null;
};

export function summaryWordsToCopy(reading: ReadingWords): Record<string, string> {
  const key = reading.summary?._key;
  if (!key) return {};
  const row = `bookingPage[_key=="${key}"]`;
  const promise = nonBlank(reading.valueProposition);
  const description = nonBlank(reading.briefDescription);
  return {
    ...(promise && !nonBlank(reading.summary?.promise) ? { [`${row}.promise`]: promise } : {}),
    ...(description && !nonBlank(reading.summary?.description) ? { [`${row}.description`]: description } : {}),
  };
}

const READINGS_QUERY = `*[_type == "reading" && !(_id in path("versions.**"))]{
  _id, valueProposition, briefDescription,
  "summary": bookingPage[_type == "summarySection"][0]{ _key, promise, description }
}`;

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const readings = await client.fetch<ReadingWords[]>(READINGS_QUERY);
  const transaction = client.transaction();
  let changes = 0;

  for (const reading of readings) {
    const words = summaryWordsToCopy(reading);
    if (Object.keys(words).length === 0) continue;
    console.log(`[${opts.dataset}] ${opts.apply ? "copying" : "would copy"} into ${reading._id}: ${Object.keys(words).join(", ")}`);
    transaction.patch(reading._id, { set: words });
    changes += 1;
  }
  for (const reading of readings.filter((row) => !row.summary?._key)) {
    console.log(`[${opts.dataset}] ${reading._id} has no "Small label, promise and description" row, left alone`);
  }

  if (changes === 0) {
    console.log(`[${opts.dataset}] every booking page already has its own promise and description.`);
    return;
  }
  if (!opts.apply) return;
  await transaction.commit();
  console.log(`[${opts.dataset}] updated ${changes} readings.`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error("Usage: pnpm tsx scripts/copy-booking-summary-words-2026-10.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
