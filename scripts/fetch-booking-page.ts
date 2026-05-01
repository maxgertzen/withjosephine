// Read-only inspection of the live bookingPage doc to check for missing fields.
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/fetch-booking-page.ts
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

async function main() {
  const doc = await client.fetch<unknown>(
    '*[_type == "bookingPage"][0]{ _id, _updatedAt, entertainmentAcknowledgment, coolingOffAcknowledgment }',
  );
  console.log(JSON.stringify(doc, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
