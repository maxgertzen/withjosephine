// Idempotent seed of eight myReadingsPage scalar fields that were
// missing on the production singleton (audit-defaults-drift run on
// 2026-06-06 flagged them as [missing-in-prod]). Uses setIfMissing so
// the script preserves any value Becky may have authored in between.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/seed-my-readings-page-fields-2026-06-06.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/seed-my-readings-page-fields-2026-06-06.ts

import { MY_READINGS_PAGE_DEFAULTS } from "../src/data/defaults";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { seedSingletonFields } from "./_lib/seedSingleton.mts";

const TARGET_FIELDS = [
  "expiredRowLabel",
  "expiredMailtoLabel",
  "expiredMailtoSubject",
  "readingsTabLabel",
  "giftsTabLabel",
  "welcomeHeading",
  "welcomeSubhead",
  "welcomeButtonLabel",
] as const;

async function main(): Promise<void> {
  loadDotenv();

  const fields: Record<string, string> = {};
  for (const field of TARGET_FIELDS) {
    const value = MY_READINGS_PAGE_DEFAULTS[field];
    if (typeof value !== "string") {
      throw new Error(`MY_READINGS_PAGE_DEFAULTS.${field} is not a string; refusing to seed.`);
    }
    fields[field] = value;
  }

  await seedSingletonFields({
    docType: "myReadingsPage",
    fields,
    logPrefix: "seed-my-readings-page-fields",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
