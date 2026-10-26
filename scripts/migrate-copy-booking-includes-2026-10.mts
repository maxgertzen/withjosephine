import { fillMissing } from "./_lib/fillMissing.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

type ReadingRow = { _id: string; includes: string[] };

const NEEDS_COPY_QUERY = `*[_type == "reading" && count(includes) > 0 && !defined(bookingIncludes)]{ _id, includes }`;

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const readings = await client.fetch<ReadingRow[]>(NEEDS_COPY_QUERY);

  if (readings.length === 0) {
    console.log(`[${opts.dataset}] every reading already has its booking page checklist.`);
    return;
  }

  const transaction = client.transaction();
  for (const reading of readings) {
    console.log(
      `[${opts.dataset}] ${opts.apply ? "copying" : "would copy"} ${reading.includes.length} lines into ${reading._id}`,
    );
    fillMissing(transaction, { _id: reading._id, fields: { bookingIncludes: reading.includes } });
  }
  if (!opts.apply) return;

  await transaction.commit();
  const remaining = await client.fetch<ReadingRow[]>(NEEDS_COPY_QUERY);
  console.log(`[${opts.dataset}] copied into ${readings.length} documents; still missing: ${remaining.length}`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      "Usage: pnpm tsx scripts/migrate-copy-booking-includes-2026-10.mts staging|production [--apply]",
    );
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
