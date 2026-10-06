import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

type Span = { text?: string };
type HowItWorksItem = string | { _type?: string; children?: Span[] };
type ReadingRow = { _id: string; howItWorks: HowItWorksItem[] };

export function linesFromHowItWorks(items: HowItWorksItem[]): string[] {
  return items
    .map((item) =>
      typeof item === "string"
        ? item
        : (item.children ?? []).map((span) => span.text ?? "").join(""),
    )
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const readings = await client.fetch<ReadingRow[]>(
    `*[_type == "reading" && count(howItWorks[_type == "block"]) > 0]{ _id, howItWorks }`,
  );

  if (readings.length === 0) {
    console.log(`[${opts.dataset}] no reading has How it works paragraphs, nothing to convert.`);
    return;
  }

  const transaction = client.transaction();
  for (const reading of readings) {
    const lines = linesFromHowItWorks(reading.howItWorks);
    console.log(
      `[${opts.dataset}] ${opts.apply ? "converting" : "would convert"} ${reading._id}: ${lines.length} lines`,
    );
    for (const line of lines) console.log(`    ${line}`);
    transaction.patch(reading._id, (patch) => patch.set({ howItWorks: lines }));
  }
  if (!opts.apply) return;

  await transaction.commit();
  const remaining = await client.fetch<number>(
    `count(*[_type == "reading" && count(howItWorks[_type == "block"]) > 0])`,
  );
  console.log(
    `[${opts.dataset}] converted ${readings.length} documents; readings still holding paragraphs: ${remaining}`,
  );
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      "Usage: pnpm tsx scripts/migrate-how-it-works-to-lines-2026-10.mts staging|production [--apply]",
    );
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
