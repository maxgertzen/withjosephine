// Idempotent migration: aligns the Sanity-backed `legalPage` document for
// `/refund-policy` with the wholesale non-refundable policy locked
// 2026-05-19.
//
// Strategy: this dataset has only ever held the seed stub for refund-policy
// (no real authored content yet), and the page's load-bearing fallback in
// `src/app/refund-policy/page.tsx` was rewritten in PR-B to express the new
// wholesale-non-refundable framing. So the safest, most idempotent move is to
// CLEAR the legacy body when it matches the seed-stub fingerprint — the page
// then renders the new fallback automatically and Becky can re-author via
// Studio whenever she's ready.
//
// If the body contains anything we don't recognise as the seed stub, we leave
// it alone and print a flag so Max can review manually (the new framing
// matters legally, so we don't trash hand-edited content silently).
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-refund-policy-no-refunds-2026-05-19.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-refund-policy-no-refunds-2026-05-19.ts

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const SLUG = "refund-policy";

// The seed stub text from `scripts/seed-legal-pages.ts`. Any body whose first
// block matches this fingerprint is the un-customised seed and is safe to
// clear so the page's fallback renders.
const SEED_STUB_TEXT =
  "This policy is managed in Sanity Studio. Replace this block with the full refund policy text.";

// Legacy v1 markers (the 14-day-refund-window framing the rewrite supersedes).
// If we find one of these, the dataset is on the OLD policy — clearing is
// strictly an improvement because the new fallback expresses the locked
// 2026-05-19 wholesale-non-refundable framing.
const LEGACY_V1_MARKERS = [
  "Request within",
  "14 days",
  "When refunds are available",
  "refund eligibility is tied to how much of that work has started",
];

type LegalPageDoc = {
  _id: string;
  body?: Array<{ _type?: string; children?: Array<{ text?: string }> }>;
};

function firstBlockText(doc: LegalPageDoc): string {
  const block = doc.body?.[0];
  if (!block?.children) return "";
  return block.children.map((c) => c.text ?? "").join("");
}

function looksLikeSeedStub(doc: LegalPageDoc): boolean {
  if (!doc.body || doc.body.length === 0) return false;
  return firstBlockText(doc).trim() === SEED_STUB_TEXT;
}

function looksLikeLegacyV1(doc: LegalPageDoc): boolean {
  if (!doc.body) return false;
  const joined = doc.body
    .map((b) => (b.children ? b.children.map((c) => c.text ?? "").join("") : ""))
    .join("\n");
  return LEGACY_V1_MARKERS.some((marker) => joined.includes(marker));
}

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-refund-policy-no-refunds] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }

  const doc = await client.fetch<LegalPageDoc | null>(
    `*[_type == "legalPage" && slug.current == $slug][0]{_id, body}`,
    { slug: SLUG },
  );

  if (!doc) {
    console.log(`[skip] no legalPage for slug="${SLUG}" in ${dataset}; page fallback renders.`);
    return;
  }

  if (!doc.body || doc.body.length === 0) {
    console.log(`[skip] ${doc._id} already has empty body; page fallback renders.`);
    return;
  }

  if (looksLikeSeedStub(doc)) {
    await client.patch(doc._id).unset(["body"]).commit();
    console.log(`Cleared seed-stub body on ${doc._id}; page fallback now renders.`);
    return;
  }

  if (looksLikeLegacyV1(doc)) {
    await client.patch(doc._id).unset(["body"]).commit();
    console.log(
      `Cleared legacy v1 (14-day-window) body on ${doc._id}; page fallback now renders the wholesale-non-refundable framing.`,
    );
    return;
  }

  console.log(
    `[manual review needed] ${doc._id} has hand-edited body that doesn't match seed stub or legacy v1 markers. ` +
      `Inspect in Studio and reconcile with the wholesale-non-refundable policy before launch. ` +
      `First block preview: ${JSON.stringify(firstBlockText(doc).slice(0, 200))}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
