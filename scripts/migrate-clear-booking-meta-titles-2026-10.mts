// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-clear-booking-meta-titles-2026-10.mts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-clear-booking-meta-titles-2026-10.mts
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

const PUBLISHED_OR_DRAFT_WITH_TITLE = `_type in ["reading", "bookingPage"] && defined(seo.metaTitle)`;

const docs = await client.fetch<{ _id: string; metaTitle: string }[]>(
  `*[${PUBLISHED_OR_DRAFT_WITH_TITLE}]{ _id, "metaTitle": seo.metaTitle }`,
);

if (docs.length === 0) {
  console.log(`[${dataset}] no reading or booking page has a seo.metaTitle, nothing to clear.`);
} else {
  const transaction = client.transaction();
  for (const doc of docs) transaction.patch(doc._id, (patch) => patch.unset(["seo.metaTitle"]));
  await transaction.commit();
  for (const doc of docs) console.log(`[${dataset}] cleared ${doc._id}: "${doc.metaTitle}"`);
}

const remaining = await client.fetch<number>(`count(*[${PUBLISHED_OR_DRAFT_WITH_TITLE}])`);
console.log(`[${dataset}] documents still carrying seo.metaTitle: ${remaining}`);
