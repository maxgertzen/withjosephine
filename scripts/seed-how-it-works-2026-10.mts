import { getReadingById } from "../src/data/readings";
import { paragraphBlocks } from "../src/lib/copy/paragraphBlocks";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const missing = await client.fetch<{ _id: string; slug: string }[]>(
    `*[_type == "reading" && !defined(howItWorks)]{ _id, "slug": slug.current }`,
  );
  const seeds = missing.flatMap((doc) => {
    const reading = getReadingById(doc.slug);
    return reading ? [{ _id: doc._id, howItWorks: paragraphBlocks(reading.howItWorks) }] : [];
  });

  if (seeds.length === 0) {
    console.log(`[${opts.dataset}] every reading already has howItWorks, nothing to fill.`);
    return;
  }

  const transaction = client.transaction();
  for (const seed of seeds) {
    console.log(`[${opts.dataset}] ${opts.apply ? "filling" : "would fill"} howItWorks on ${seed._id}`);
    transaction.patch(seed._id, (patch) => patch.setIfMissing({ howItWorks: seed.howItWorks }));
  }
  if (!opts.apply) return;

  await transaction.commit();
  const after = await client.fetch(`*[_type == "reading"]{ _id, "howItWorks": count(howItWorks) }`);
  console.log(`[${opts.dataset}] after:`, JSON.stringify(after));
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error("Usage: pnpm tsx scripts/seed-how-it-works-2026-10.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
