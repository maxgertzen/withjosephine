import type { SanityClient } from "@sanity/client";

import {
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  READING_CARD_LABEL_KEYS,
  READINGS_SECTION_DEFAULTS,
} from "../src/data/defaults";
import { getReadingById } from "../src/data/readings";
import { paragraphBlocks } from "../src/lib/copy/paragraphBlocks";
import { fillMissing, type FillMissingSeed } from "./_lib/fillMissing.mts";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

type ReadingRow = { _id: string; slug: string; hasHow: boolean; hasIntro: boolean };

async function readingSeeds(client: SanityClient): Promise<FillMissingSeed[]> {
  const readings = await client.fetch<ReadingRow[]>(
    `*[_type == "reading"]{ _id, "slug": slug.current, "hasHow": defined(howItWorks), "hasIntro": defined(intakeIntro) }`,
  );
  const howItWorksNeverSeeded = readings.every((doc) => !doc.hasHow);
  return readings.flatMap((doc) => {
    const reading = getReadingById(doc.slug);
    const fields = {
      ...(howItWorksNeverSeeded && reading ? { howItWorks: paragraphBlocks(reading.howItWorks) } : {}),
      ...(doc.hasIntro
        ? {}
        : { intakeIntro: paragraphBlocks(INTAKE_INTRO_BY_SLUG[doc.slug] ?? INTAKE_INTRO_FALLBACK) }),
    };
    return Object.keys(fields).length > 0 ? [{ _id: doc._id, fields }] : [];
  });
}

async function cardLabelSeeds(client: SanityClient): Promise<FillMissingSeed[]> {
  const pages = await client.fetch<{ _id: string; labels: Record<string, unknown> | null }[]>(
    `*[_type == "landingPage"]{ _id, "labels": readingsSection }`,
  );
  return pages.flatMap((page) => {
    const missing = READING_CARD_LABEL_KEYS.filter((key) => page.labels?.[key] === undefined);
    if (missing.length === 0) return [];
    const fields = Object.fromEntries(
      missing.map((key) => [`readingsSection.${key}`, READINGS_SECTION_DEFAULTS[key]]),
    );
    return [{ _id: page._id, fields, parent: "readingsSection" }];
  });
}

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const seeds = [...(await readingSeeds(client)), ...(await cardLabelSeeds(client))];

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
    console.error("Usage: pnpm tsx scripts/seed-reading-defaults-2026-10.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
