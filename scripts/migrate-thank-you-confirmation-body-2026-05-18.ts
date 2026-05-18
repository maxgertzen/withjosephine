// Idempotent reset of legacy `thankYouPage.confirmationBody`. Only writes
// when the current value matches a known legacy string so hand-edited
// values are preserved.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-thank-you-confirmation-body-2026-05-18.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-thank-you-confirmation-body-2026-05-18.ts

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const LEGACY_BODIES = new Set([
  "A confirmation email is on its way to your inbox in the next minute or two — it includes a copy of the answers you shared so you have them on hand. If you can’t find it, please check your promotions folder.",
  "A confirmation email is on its way to your inbox in the next minute or two - it includes a copy of the answers you shared so you have them on hand. If you can't find it, please check your promotions folder.",
]);

const NEW_BODY =
  "A confirmation email is on its way to your inbox in the next minute or two. If you can’t find it, please check your promotions folder.";

type ThankYouDoc = {
  _id: string;
  confirmationBody?: string;
};

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-thank-you-confirmation-body] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<ThankYouDoc | null>(
    `*[_type == "thankYouPage"][0]{_id, confirmationBody}`,
  );
  if (!doc) {
    console.warn("[skip] no thankYouPage singleton in this dataset.");
    return;
  }
  if (!doc.confirmationBody || !LEGACY_BODIES.has(doc.confirmationBody)) {
    console.log(
      `No legacy confirmationBody matched on ${doc._id}; current value: ${JSON.stringify(doc.confirmationBody)}.`,
    );
    return;
  }
  await client.patch(doc._id).set({ confirmationBody: NEW_BODY }).commit();
  console.log(`Reset confirmationBody on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
