// Seeds the 6 new gift-variant fields on the thankYouPage singleton:
// giftPurchaserHeading / Subheading / Body and giftRecipientHeading /
// Subheading / Body. Phase 4 P4.2.
//
// Without these, a gift purchaser landing on /thank-you/:slug?sessionId=…
// would see the generic "Thank you for booking" copy; a redeemed gift
// recipient would previously bounce to "/" because they have no Stripe
// sessionId. Phase 4 closes both surfaces and adds Sanity-editable copy
// so Becky can tune the voice without a deploy.
//
// Idempotent: setIfMissing leaves Becky-edited values alone.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-thank-you-gift-variant-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-thank-you-gift-variant-2026-05.ts
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const SEED: Record<string, string> = {
  giftPurchaserHeading: "Thank you, {purchaserFirstName}. Your gift is on its way.",
  giftPurchaserSubheading:
    "I'll take it from here. The recipient will receive a note from me with their claim link.",
  giftPurchaserBody:
    "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link, and they'll share their intake details with me from there.",
  giftRecipientHeading: "Thank you. Your reading is in my hands now.",
  giftRecipientSubheading: "I've received everything I need to begin.",
  giftRecipientBody:
    "I'll begin your reading within the next two days. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.",
};

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-thank-you-gift-variant] dataset=${dataset}`);
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
  await client.patch(doc._id).setIfMissing(SEED).commit();
  console.log(`Seeded ${Object.keys(SEED).length} gift-variant fields (setIfMissing) on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
