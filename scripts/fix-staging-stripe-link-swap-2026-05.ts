// Becky bug #6: staging Sanity had Birth Chart's stripePaymentLink pointing
// at Soul Blueprint's URL and vice versa. Verified against the canonical
// list Max captured 2026-05-16; this script swaps them back. Idempotent —
// a re-run after the fix is a no-op because the script asserts current
// values before writing.
//
// Staging only. Production has its own Studio verification (P4.4 Max-action).
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const TARGET: Record<string, string> = {
  "soul-blueprint": "https://buy.stripe.com/test_14A5kveT5fdzgosdqY8Vi02",
  "birth-chart": "https://buy.stripe.com/test_bJebIT4er9Tf8W09aI8Vi01",
  "akashic-record": "https://buy.stripe.com/test_00w00b5iv2qN4FK0Ec8Vi00",
};

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  if (dataset !== "staging") {
    throw new Error(`Refusing to run against dataset=${dataset}; staging only.`);
  }
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const client = sanityWriteClient();

  const rows = await client.fetch<Array<{ _id: string; slug: string; stripePaymentLink: string | null }>>(
    `*[_type == "reading"]{ _id, "slug": slug.current, stripePaymentLink }`,
  );

  for (const row of rows) {
    const target = TARGET[row.slug];
    if (!target) {
      console.log(`[skip] unknown slug ${row.slug} (id=${row._id})`);
      continue;
    }
    if (row.stripePaymentLink === target) {
      console.log(`[noop] ${row.slug} already correct`);
      continue;
    }
    console.log(`[fix]  ${row.slug}: ${row.stripePaymentLink} -> ${target}`);
    await client.patch(row._id).set({ stripePaymentLink: target }).commit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
