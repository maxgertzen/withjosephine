// Read-only probe: fetch every reading doc's stripePaymentLink and compare
// against the canonical TARGET map from fix-staging-stripe-link-swap-2026-05.ts.
// Reports drift; modifies nothing. Runs against whichever dataset
// NEXT_PUBLIC_SANITY_DATASET resolves to (so the same script works for
// staging dry-run + production verification of P5.8a).
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const TARGET: Record<string, string> = {
  "soul-blueprint": "https://buy.stripe.com/test_14A5kveT5fdzgosdqY8Vi02",
  "birth-chart": "https://buy.stripe.com/test_bJebIT4er9Tf8W09aI8Vi01",
  "akashic-record": "https://buy.stripe.com/test_00w00b5iv2qN4FK0Ec8Vi00",
};

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const client = sanityWriteClient({ readOnly: true });

  const rows = await client.fetch<Array<{ _id: string; slug: string; stripePaymentLink: string | null }>>(
    `*[_type == "reading"]{ _id, "slug": slug.current, stripePaymentLink }`,
  );

  console.log(`\nDataset: ${dataset}`);
  console.log(`Rows found: ${rows.length}\n`);

  let drift = 0;
  for (const row of rows) {
    const target = TARGET[row.slug];
    const status = !target
      ? "UNKNOWN_SLUG"
      : row.stripePaymentLink === target
        ? "OK"
        : "DRIFT";
    if (status === "DRIFT") drift++;
    console.log(`[${status}] ${row.slug.padEnd(16)} current=${row.stripePaymentLink ?? "<null>"}`);
    if (status === "DRIFT") {
      console.log(`           expected=${target}`);
    }
  }

  console.log(`\n${drift === 0 ? "PASS" : "FAIL"}: ${drift} drift row(s).`);
  process.exit(drift === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
