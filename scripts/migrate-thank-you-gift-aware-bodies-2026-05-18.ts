// Adds the four new gift-aware fields to the existing `thankYouPage`
// singleton via `setIfMissing` so hand-edited values are preserved and
// editors see the fields populated with the locked defaults.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-thank-you-gift-aware-bodies-2026-05-18.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-thank-you-gift-aware-bodies-2026-05-18.ts

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const NEW_FIELDS = {
  giftPurchaserTimelineBody:
    "I'll begin the recipient's reading within the next two days of them claiming the gift, and I'll send them a short note when I do. Their voice note and PDF will arrive within {deliveryDays}, sent to the email they use to claim.",
  giftPurchaserContactBody:
    "If anything comes up with the gift — a wrong recipient email, a change of plan, anything that doesn't look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.",
  giftRecipientContactBody:
    "If anything comes up — a question, a detail you forgot to mention, or anything that doesn't look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.",
} as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-thank-you-gift-aware-bodies] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "thankYouPage"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no thankYouPage singleton in this dataset.");
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
