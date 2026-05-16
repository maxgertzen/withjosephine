// Resets `bookingPage.formatNote` and `bookingPage.deliveryNote` from their
// legacy overlapping copy to distinct WHAT-vs-WHEN strings. Closes Becky bug #1
// ("voice/PDF duplicate"): the two notes used to share ~17 chars of substring;
// Phase 4 separates them so formatNote describes the deliverable (voice note +
// PDF) and deliveryNote describes the timeline.
//
// Only writes when the current value matches a known legacy string. If Becky
// has already edited the value to her own copy, this migration is a no-op for
// that field. Re-runnable.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-booking-page-copy-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-booking-page-copy-2026-05.ts
import { BOOKING_INFO_DEFAULTS } from "../src/data/defaults";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const LEGACY_DELIVERY_NOTES = new Set([
  "You'll receive your voice note and PDF within 7 days of payment.",
  "You’ll receive your voice note and PDF within 7 days of payment.",
]);
const LEGACY_FORMAT_NOTES = new Set([
  "Detailed voice note recording + a supporting PDF created entirely for you.",
  "A spoken voice note plus a written PDF you can keep.",
]);

type BookingPageDoc = {
  _id: string;
  formatNote?: string;
  deliveryNote?: string;
};

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-booking-page-copy] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<BookingPageDoc | null>(
    `*[_type == "bookingPage"][0]{_id, formatNote, deliveryNote}`,
  );
  if (!doc) {
    console.warn("[skip] no bookingPage singleton in this dataset.");
    return;
  }

  const patch: Record<string, string> = {};
  if (doc.formatNote && LEGACY_FORMAT_NOTES.has(doc.formatNote)) {
    patch.formatNote = BOOKING_INFO_DEFAULTS.deliverableNote;
  }
  if (doc.deliveryNote && LEGACY_DELIVERY_NOTES.has(doc.deliveryNote)) {
    patch.deliveryNote = BOOKING_INFO_DEFAULTS.deliveryNote;
  }

  if (Object.keys(patch).length === 0) {
    console.log(
      `No legacy values matched on ${doc._id}; nothing to migrate (current: formatNote=${JSON.stringify(doc.formatNote)}, deliveryNote=${JSON.stringify(doc.deliveryNote)}).`,
    );
    return;
  }

  await client.patch(doc._id).set(patch).commit();
  console.log(`Reset ${Object.keys(patch).join(", ")} on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
