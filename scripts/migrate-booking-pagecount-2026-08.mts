// Sets the booking form's per-reading page counts.
//
// `pageCount` can only merge TRAILING pages, so 2 means "first section, then
// everything else". Rebalancing pages needs code, not this script.
//
// Idempotent: writes only when a value differs, and leaves other entries alone.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-booking-pagecount-2026-08.mts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-booking-pagecount-2026-08.mts
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const TARGETS: Record<string, { key: string; pageCount: number }> = {
  "akashic-record": { key: "akashic", pageCount: 1 },
  "soul-blueprint": { key: "soul-blueprint", pageCount: 2 },
};

type Override = { _key: string; readingSlug: string; pageCount?: number };

const client = sanityWriteClient();
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

const PUBLISHED_BOOKING_FORM = `*[_type == "bookingForm" && !(_id in path("drafts.**"))][0]`;

const doc = await client.fetch<{ _id: string; overrides: Override[] | null } | null>(
  `${PUBLISHED_BOOKING_FORM}{ _id, "overrides": pagination.overrides }`,
);

if (!doc) {
  throw new Error(`No bookingForm document found in dataset "${dataset}"`);
}

const current = doc.overrides ?? [];
const next: Override[] = [...current];
const changes: string[] = [];

for (const [slug, target] of Object.entries(TARGETS)) {
  const index = next.findIndex((entry) => entry.readingSlug === slug);
  if (index === -1) {
    next.push({ _key: target.key, readingSlug: slug, pageCount: target.pageCount });
    changes.push(`${slug}: (none) -> ${target.pageCount}`);
    continue;
  }
  const existing = next[index];
  if (existing.pageCount === target.pageCount) continue;
  next[index] = { ...existing, pageCount: target.pageCount };
  changes.push(`${slug}: ${existing.pageCount ?? "(unset)"} -> ${target.pageCount}`);
}

if (changes.length === 0) {
  console.log(`[${dataset}] already at target page counts, nothing to write.`);
} else {
  await client.patch(doc._id).set({ "pagination.overrides": next }).commit();
  console.log(`[${dataset}] patched ${doc._id}:`);
  for (const change of changes) console.log(`  ${change}`);
}

const verify = await client.fetch<Override[] | null>(
  `${PUBLISHED_BOOKING_FORM}.pagination.overrides`,
);
console.log(`[${dataset}] now:`, JSON.stringify(verify));
