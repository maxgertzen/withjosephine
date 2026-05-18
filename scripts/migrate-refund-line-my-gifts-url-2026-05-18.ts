// Idempotent rewrite of legacy `emailGiftPurchaseConfirmation.refundLine` strings
// that hardcoded the production `withjosephine.com/my-gifts` URL into a
// templating-slot variant (`{myGiftsUrl}`) so staging emails render the
// staging URL and any future origin override works without redeploys.
//
// Only writes when the current value matches a known legacy string so
// hand-edited copy is preserved.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-refund-line-my-gifts-url-2026-05-18.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-refund-line-my-gifts-url-2026-05-18.ts

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const LEGACY_REFUND_LINES = new Set([
  "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your gifts page at withjosephine.com/my-gifts.",
  "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your gifts page at https://withjosephine.com/my-gifts.",
]);

const NEW_REFUND_LINE =
  "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your gifts page at {myGiftsUrl}.";

type EmailGiftPurchaseConfirmationDoc = {
  _id: string;
  refundLine?: string;
};

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-refund-line-my-gifts-url] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<EmailGiftPurchaseConfirmationDoc | null>(
    `*[_type == "emailGiftPurchaseConfirmation"][0]{_id, refundLine}`,
  );
  if (!doc) {
    console.warn("[skip] no emailGiftPurchaseConfirmation singleton in this dataset.");
    return;
  }
  if (!doc.refundLine || !LEGACY_REFUND_LINES.has(doc.refundLine)) {
    console.log(
      `No legacy refundLine matched on ${doc._id}; current value: ${JSON.stringify(doc.refundLine)}.`,
    );
    return;
  }
  await client.patch(doc._id).set({ refundLine: NEW_REFUND_LINE }).commit();
  console.log(`Reset refundLine on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
