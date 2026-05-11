// Splice the Phase 4 verbatim retention + rights section into the live
// privacy policy. Section consists of 1 H2 + 3 paragraph blocks ("What we
// collect and why" / "How long we keep it" / "Your rights and how to
// exercise them"), all from PRD `## Decisions` locked 2026-05-09 by
// Privacy Counsel. Idempotent: skips if the H2 block key is already present.
//
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/migrate-privacy-retention.ts
//
// Run BOTH against production and staging datasets. Override the dataset
// via NEXT_PUBLIC_SANITY_DATASET=staging for the second pass.
import { createClient } from "@sanity/client";

import {
  READING_CONTENT_RETENTION_YEARS,
  TAX_RETENTION_YEARS,
} from "../src/lib/compliance/retention";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

type Span = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

type MarkDef = {
  _type: "link";
  _key: string;
  href: string;
};

type Block = {
  _type: "block";
  _key: string;
  style: string;
  children: Span[];
  markDefs: MarkDef[];
};

type LegalPageDoc = {
  _id: string;
  _rev: string;
  body: Block[];
  lastUpdated: string;
};

const KEY_PREFIX = "priv-retention-2026-05";
const H2_KEY = `${KEY_PREFIX}-h2`;
const P1_KEY = `${KEY_PREFIX}-p1`;
const P2_KEY = `${KEY_PREFIX}-p2`;
const P3_KEY = `${KEY_PREFIX}-p3`;
const NEW_LAST_UPDATED = "2026-05-11";

function plainBlock(key: string, style: string, text: string): Block {
  return {
    _type: "block",
    _key: key,
    style,
    markDefs: [],
    children: [{ _type: "span", _key: `${key}-s0`, text, marks: [] }],
  };
}

function blockWithStrong(key: string, parts: Array<{ text: string; strong?: boolean }>): Block {
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [],
    children: parts.map((part, i) => ({
      _type: "span",
      _key: `${key}-s${i}`,
      text: part.text,
      marks: part.strong ? ["strong"] : [],
    })),
  };
}

function retentionBlocks(): Block[] {
  return [
    plainBlock(H2_KEY, "h2", "Retention and your rights"),

    // "What we collect and why" — verbatim from PRD ## Decisions.
    plainBlock(
      P1_KEY,
      "normal",
      "When you book a reading we collect your name, email, date and place of birth, time of birth (if known), a photo, and your free-text answers to the intake form. We use this to prepare your reading. Stripe processes your payment separately and we receive only the transaction confirmation. We do not sell your data, and we do not use your intake content for marketing.",
    ),

    // "How long we keep it" — uses the retention.ts constants so the text
    // can never drift from the value the cascade uses to compute
    // `financial_records.retained_until`.
    blockWithStrong(P2_KEY, [
      {
        text:
          `Your reading content (intake answers, photo, voice note, PDF) is retained for ${READING_CONTENT_RETENTION_YEARS} years from the booking date and then permanently deleted, unless you ask us to delete it sooner. Your transactional record (name, email, amount, date, country) is retained for ${TAX_RETENTION_YEARS} years to satisfy UK HMRC self-assessment record-keeping requirements — this is the minimum we can hold under law and we cannot delete it earlier. If you join the newsletter, we keep your email until you unsubscribe; if you do not, we don't add you. Backups are kept for 90 days on a rolling basis and age out automatically.`,
      },
    ]),

    // "Your rights and how to exercise them" — Privacy Counsel locked text.
    blockWithStrong(P3_KEY, [
      {
        text:
          "You have the right to access, correct, port, or delete your data, and to withdraw consent at any time. Email ",
      },
      { text: "hello@withjosephine.com", strong: true },
      {
        text:
          " with the subject \"Privacy request\" and include the email you booked under. We respond within 30 days. Deletion takes effect immediately on our active systems; backup copies are placed beyond use and overwrite within 90 days. If we cannot delete a record (because of the 6-year tax-retention obligation above), we will tell you, and we will minimise what we keep to the legally required fields only.",
      },
    ]),
  ];
}

async function main() {
  const doc = await client.fetch<LegalPageDoc | null>(
    '*[_type == "legalPage" && slug.current == "privacy"][0]{ _id, _rev, body, lastUpdated }',
  );
  if (!doc) {
    throw new Error("Privacy legalPage document not found");
  }

  if (doc.body.some((block) => block._key === H2_KEY)) {
    console.log("Retention section already present — nothing to do.");
    return;
  }

  // Append to the end of the body. Reviewing live privacy pages in production
  // would let us pick a smarter insertion point, but append is correct + safe
  // — the section reads as a coherent stand-alone block, and Becky/Josephine
  // can reorder via Studio if they want it earlier in the page.
  const newBody: Block[] = [...doc.body, ...retentionBlocks()];

  console.log(
    `Patching legalPage-privacy: +4 blocks (H2 + 3 paragraphs), lastUpdated ${doc.lastUpdated} -> ${NEW_LAST_UPDATED}`,
  );

  await client
    .patch(doc._id)
    .set({ body: newBody, lastUpdated: NEW_LAST_UPDATED })
    .commit();

  const verify = await client.fetch<LegalPageDoc>(
    `*[_id == $id][0]{ _id, body, lastUpdated }`,
    { id: doc._id },
  );
  const allLanded = [H2_KEY, P1_KEY, P2_KEY, P3_KEY].every((key) =>
    verify.body.some((block) => block._key === key),
  );
  if (!allLanded) {
    throw new Error("One or more retention blocks not found after patch — write may have failed");
  }
  if (verify.lastUpdated !== NEW_LAST_UPDATED) {
    throw new Error(`lastUpdated did not update (got ${verify.lastUpdated})`);
  }
  console.log("Verified: 4 blocks landed (H2 + 3 paragraphs); lastUpdated bumped.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
