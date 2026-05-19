// Seeds the 4 new myGiftsPage fields for the D-11 cancel-scheduled control:
//
//   cancelScheduledCtaLabel
//   cancelScheduledConfirmCtaLabel
//   cancelScheduledSendingLabel
//   cancelScheduledSessionExpiredError
//
// Idempotent — setIfMissing preserves any Becky-edited values.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-my-gifts-cancel-scheduled-copy-2026-05-19.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-my-gifts-cancel-scheduled-copy-2026-05-19.ts
import { MY_GIFTS_PAGE_DEFAULTS } from "../src/data/defaults";

import { seedSingletonFields } from "./_lib/seedSingleton.mts";

const NEW_FIELDS = [
  "cancelScheduledCtaLabel",
  "cancelScheduledConfirmCtaLabel",
  "cancelScheduledSendingLabel",
  "cancelScheduledSessionExpiredError",
] as const;

async function main(): Promise<void> {
  const fields: Record<string, string> = {};
  for (const key of NEW_FIELDS) fields[key] = MY_GIFTS_PAGE_DEFAULTS[key];
  await seedSingletonFields({
    docType: "myGiftsPage",
    fields,
    logPrefix: "migrate-my-gifts-cancel-scheduled-copy",
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
