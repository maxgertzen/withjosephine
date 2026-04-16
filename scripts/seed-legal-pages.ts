/**
 * Seed legal page documents in Sanity.
 *
 * Uses createIfNotExists with stable IDs so:
 *   - Running this again is a no-op for anything already created
 *   - Edits made later in Studio are NEVER overwritten
 *   - SEO fields are included on each document
 *
 * The body field contains a single placeholder block — Josephine can
 * replace it in Studio with the full policy text. Until she does, the
 * Next.js routes render from their hardcoded JSX fallbacks.
 *
 * Run:
 *   cd www
 *   set -a && source .env.local && set +a && pnpm tsx scripts/seed-legal-pages.ts
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

type LegalPageSeed = {
  _id: string;
  _type: "legalPage";
  title: string;
  slug: { _type: "slug"; current: string };
  tag: string;
  lastUpdated: string;
  body: Array<{
    _type: "block";
    _key: string;
    style: string;
    children: Array<{ _type: "span"; _key: string; text: string; marks: string[] }>;
    markDefs: never[];
  }>;
  seo: { metaTitle: string; metaDescription: string };
  order: number;
};

function placeholderBlock(key: string, text: string): LegalPageSeed["body"][number] {
  return {
    _type: "block",
    _key: key,
    style: "normal",
    children: [{ _type: "span", _key: `${key}-span`, text, marks: [] }],
    markDefs: [],
  };
}

const LEGAL_PAGES: LegalPageSeed[] = [
  {
    _id: "legalPage-privacy",
    _type: "legalPage",
    title: "Privacy Policy",
    slug: { _type: "slug", current: "privacy" },
    tag: "\u2726 Privacy",
    lastUpdated: "2026-04-15",
    body: [
      placeholderBlock(
        "privacy-1",
        "This policy is managed in Sanity Studio. Replace this block with the full privacy policy text.",
      ),
    ],
    seo: {
      metaTitle: "Privacy Policy — Josephine",
      metaDescription:
        "How Josephine Soul Readings handles your personal information. Plain language, no surprises. Your details stay yours.",
    },
    order: 10,
  },
  {
    _id: "legalPage-terms",
    _type: "legalPage",
    title: "Terms of Service",
    slug: { _type: "slug", current: "terms" },
    tag: "\u2726 Terms",
    lastUpdated: "2026-04-15",
    body: [
      placeholderBlock(
        "terms-1",
        "This policy is managed in Sanity Studio. Replace this block with the full terms of service text.",
      ),
    ],
    seo: {
      metaTitle: "Terms of Service — Josephine",
      metaDescription:
        "The terms that apply when you book a reading with Josephine. Written plainly so you know exactly what to expect.",
    },
    order: 20,
  },
  {
    _id: "legalPage-refund-policy",
    _type: "legalPage",
    title: "Refund Policy",
    slug: { _type: "slug", current: "refund-policy" },
    tag: "\u2726 Refunds",
    lastUpdated: "2026-04-15",
    body: [
      placeholderBlock(
        "refund-1",
        "This policy is managed in Sanity Studio. Replace this block with the full refund policy text.",
      ),
    ],
    seo: {
      metaTitle: "Refund Policy — Josephine",
      metaDescription:
        "Clear refund terms for all Josephine readings. What's covered, what isn't, and how to reach out if something feels off.",
    },
    order: 30,
  },
];

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is required");
  }
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }

  console.log("=== Checking existing legal pages ===");
  const existing = await client.fetch<
    Array<{ _id: string; title: string; slug: { current: string } }>
  >(`*[_type == "legalPage"]{ _id, title, "slug": slug }`);

  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing legalPage document(s):`);
    for (const doc of existing) {
      console.log(`  ${doc._id}: ${doc.title} (/${doc.slug?.current})`);
    }
  } else {
    console.log("No existing legalPage documents found.");
  }

  console.log("\n=== Seeding ===");
  const transaction = client.transaction();
  let created = 0;
  let skipped = 0;

  for (const page of LEGAL_PAGES) {
    const existingDoc = existing.find((d) => d._id === page._id);
    if (existingDoc) {
      console.log(`SKIP  ${page._id} — already exists as "${existingDoc.title}"`);
      skipped++;
    } else {
      console.log(`CREATE  ${page._id} — ${page.title} (/${page.slug.current})`);
      transaction.createIfNotExists(page);
      created++;
    }
  }

  if (created > 0) {
    await transaction.commit();
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
