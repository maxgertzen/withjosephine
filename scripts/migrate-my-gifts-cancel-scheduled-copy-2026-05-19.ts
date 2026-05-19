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

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const NEW_FIELDS = [
  "cancelScheduledCtaLabel",
  "cancelScheduledConfirmCtaLabel",
  "cancelScheduledSendingLabel",
  "cancelScheduledSessionExpiredError",
] as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-my-gifts-cancel-scheduled-copy] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "myGiftsPage"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no myGiftsPage singleton in this dataset.");
    return;
  }
  const seed: Record<string, string> = {};
  for (const key of NEW_FIELDS) seed[key] = MY_GIFTS_PAGE_DEFAULTS[key];
  await client.patch(doc._id).setIfMissing(seed).commit();
  console.log(`Seeded ${NEW_FIELDS.length} fields (setIfMissing) on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
