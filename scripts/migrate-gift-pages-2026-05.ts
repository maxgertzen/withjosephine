// Seed migration for the two new gift-page doctypes introduced in Phase 5
// Session 5: `giftClaimPage` (copy for /gift/claim's two states) and
// `giftIntakePage` (chrome around the intake form on /gift/intake).
//
// Both are singletons: the deskStructure pins them to a stable `_id` matching
// the schema name so Becky always edits the same document. This script uses
// `createIfNotExists` to seed the singletons on first run and is otherwise a
// no-op — if Becky has already created the docs (e.g. via Studio), we leave
// her copy alone.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-gift-pages-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-gift-pages-2026-05.ts
import {
  GIFT_CLAIM_PAGE_DEFAULTS,
  GIFT_INTAKE_PAGE_DEFAULTS,
} from "../src/data/defaults";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

type Seed = {
  docType: "giftClaimPage" | "giftIntakePage";
  body: Record<string, string>;
};

const SEEDS: Seed[] = [
  {
    docType: "giftClaimPage",
    body: { ...GIFT_CLAIM_PAGE_DEFAULTS },
  },
  {
    docType: "giftIntakePage",
    body: { ...GIFT_INTAKE_PAGE_DEFAULTS },
  },
];

async function seedOne(seed: Seed): Promise<"created" | "skipped"> {
  const existing = await client.fetch<{ _id: string } | null>(
    `*[_id == $id][0]{_id}`,
    { id: seed.docType },
  );
  if (existing) return "skipped";
  await client.createIfNotExists({
    _id: seed.docType,
    _type: seed.docType,
    ...seed.body,
  });
  return "created";
}

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-gift-pages-2026-05] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const results = await Promise.all(SEEDS.map((s) => seedOne(s).then((r) => ({ ...s, r }))));
  for (const { docType, r } of results) {
    console.log(`  ${docType.padEnd(20)} → ${r}`);
  }
  const created = results.filter((x) => x.r === "created").length;
  const skipped = results.filter((x) => x.r === "skipped").length;
  console.log(`Done. created=${created} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
