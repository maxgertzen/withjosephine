// Unset the orphaned entertainmentAcknowledgment + coolingOffAcknowledgment
// fields on the live bookingPage doc. Schema fields removed in 2026-05-02
// when the dead BookingForm component was deleted.
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/unset-booking-page-acknowledgments.ts
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

async function main() {
  const doc = await client.fetch<{ _id: string } | null>(
    '*[_type == "bookingPage"][0]{ _id }',
  );
  if (!doc) {
    console.log("No bookingPage document found.");
    return;
  }
  console.log(`Unsetting orphan fields on ${doc._id}...`);
  await client
    .patch(doc._id)
    .unset(["entertainmentAcknowledgment", "coolingOffAcknowledgment"])
    .commit();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
