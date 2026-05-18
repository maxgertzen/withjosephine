// Adds the new `sessionExpiredHeading` + `sessionExpiredBody` fields to the
// existing `giftClaimPage` singleton via `setIfMissing` so editors see them
// populated with the locked defaults. Schema `initialValue` only fires on
// first document creation — existing singletons need this migration to pick
// up new fields without overwriting hand-edited copy.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-gift-claim-session-expired-2026-05-18.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-gift-claim-session-expired-2026-05-18.ts

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const NEW_FIELDS = {
  sessionExpiredHeading: "Your link rested for a moment",
  sessionExpiredBody:
    "Your claim session timed out. Open the gift link from your original email again — it's still good, and your reading is waiting.",
} as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-gift-claim-session-expired] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "giftClaimPage"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no giftClaimPage singleton in this dataset.");
    return;
  }
  await client.patch(doc._id).setIfMissing(NEW_FIELDS).commit();
  console.log(
    `setIfMissing applied to ${doc._id} for: ${Object.keys(NEW_FIELDS).join(", ")}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
