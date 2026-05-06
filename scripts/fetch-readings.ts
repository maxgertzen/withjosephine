// Read-only inspection of live reading docs across both datasets.
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/fetch-readings.ts
import { createClient } from "@sanity/client";

async function fetchFor(dataset: string) {
  const client = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
    token: process.env.SANITY_WRITE_TOKEN,
  });

  const docs = await client.fetch<
    Array<{
      _id: string;
      slug: { current: string };
      name: string;
      price: number;
      priceDisplay: string;
      stripePaymentLink?: string;
    }>
  >(
    '*[_type == "reading"]{ _id, slug, name, price, priceDisplay, stripePaymentLink } | order(slug.current asc)',
  );

  console.log(`\n=== ${dataset} ===`);
  for (const r of docs) {
    const cents = r.price;
    const dollars = cents / 100;
    const displayMatchesCents = r.priceDisplay === `$${dollars.toFixed(0)}` ||
      r.priceDisplay === `$${dollars.toFixed(2)}`;
    console.log(
      `${r.slug.current.padEnd(20)} _id=${r._id.padEnd(40)} price=${cents}¢ display="${r.priceDisplay}"  ${
        displayMatchesCents ? "✓" : "✗ MISMATCH"
      }  stripe=${r.stripePaymentLink ?? "(none)"}`,
    );
  }
}

async function main() {
  await fetchFor("production");
  await fetchFor("staging");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
