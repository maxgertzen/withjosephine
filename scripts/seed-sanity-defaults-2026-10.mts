// Run staging first, then production after v1.20.0 is live:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/seed-sanity-defaults-2026-10.mts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/seed-sanity-defaults-2026-10.mts
import { NOTES_DEFAULTS, READING_PAGE_DEFAULTS } from "../src/data/defaults";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();
const { dataset } = client.config();

const withKeys = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item, index) => ({ _key: `fact${index + 1}`, _type: "readingFact", ...item }))
    : value;

const readingPageFields = Object.fromEntries(
  Object.entries(READING_PAGE_DEFAULTS).map(([key, value]) => [`readingPageContent.${key}`, withKeys(value)]),
);
const notesFields = Object.fromEntries(Object.entries(NOTES_DEFAULTS).filter(([, value]) => value !== ""));

const SEEDS = [
  { id: "bookingForm", fields: readingPageFields, parent: "readingPageContent" },
  { id: "notesSettings", fields: notesFields },
].map((seed) => ({ ...seed, docIds: [seed.id, `drafts.${seed.id}`] }));

const existing = new Set(
  await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: SEEDS.flatMap((seed) => seed.docIds) }),
);

const transaction = client.transaction();
for (const seed of SEEDS) {
  for (const id of seed.docIds.filter((docId) => existing.has(docId))) {
    transaction.patch(id, (patch) =>
      (seed.parent ? patch.setIfMissing({ [seed.parent]: {} }) : patch).setIfMissing(seed.fields),
    );
    console.log(`[${dataset}] filling empty fields on ${id}: ${Object.keys(seed.fields).length} fields`);
  }
}
await transaction.commit();

const check = await client.fetch(
  `*[_id in $ids]{ _id, "facts": count(readingPageContent.facts), "eyebrow": readingPageContent.eyebrow, indexTitle }`,
  { ids: [...existing] },
);
console.log(`[${dataset}] after:`, JSON.stringify(check));
