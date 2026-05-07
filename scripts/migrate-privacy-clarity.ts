// Splice Microsoft Clarity sub-processor disclosure into the live privacy
// policy. Idempotent: skips if CLARITY_BLOCK_KEY is already present.
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/migrate-privacy-clarity.ts
import { createClient } from "@sanity/client";

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
  level?: number;
  listItem?: string;
};

type LegalPageDoc = {
  _id: string;
  _rev: string;
  body: Block[];
  lastUpdated: string;
};

const CLARITY_BLOCK_KEY = "priv-clarity-2026-05";
const MIXPANEL_BLOCK_KEY = "priv-mixpanel-2026-05";
const NEW_LAST_UPDATED = "2026-05-07";

function clarityProcessorBlock(): Block {
  return {
    _type: "block",
    _key: CLARITY_BLOCK_KEY,
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [
      {
        _type: "link",
        _key: `${CLARITY_BLOCK_KEY}-link`,
        href: "https://privacy.microsoft.com/en-us/privacystatement",
      },
    ],
    children: [
      {
        _type: "span",
        _key: `${CLARITY_BLOCK_KEY}-s0`,
        text: "Microsoft Clarity",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: `${CLARITY_BLOCK_KEY}-s1`,
        text: " — provides anonymous session replay and Core Web Vitals (page-load timing, layout-shift, interactivity) so Josephine can diagnose intake-form friction. The Clarity dashboard is configured in Strict masking mode, and the intake form additionally carries a data-clarity-mask attribute for defense-in-depth, so names, dates of birth, photographs, and free-text answers render as redacted blocks in replays. The data controller in the EU is Microsoft Ireland Operations Limited under Microsoft's Data Protection Addendum (auto-active via the Clarity Terms — no separate signup). Data is transferred to and processed in the United States under the EU–US Data Privacy Framework and Standard Contractual Clauses. Visitors in the EU/EEA, UK, and Switzerland see a consent banner first; session recording only begins after the visitor explicitly accepts (Microsoft Clarity's Consent API v2 has been mandatory since 31 October 2025 for those regions). Outside those regions, anonymous session recording is enabled by default in line with applicable laws. See ",
        marks: [],
      },
      {
        _type: "span",
        _key: `${CLARITY_BLOCK_KEY}-s2`,
        text: "Microsoft’s privacy statement",
        marks: [`${CLARITY_BLOCK_KEY}-link`],
      },
      {
        _type: "span",
        _key: `${CLARITY_BLOCK_KEY}-s3`,
        text: ".",
        marks: [],
      },
    ],
  };
}

async function main() {
  const doc = await client.fetch<LegalPageDoc | null>(
    '*[_type == "legalPage" && slug.current == "privacy"][0]{ _id, _rev, body, lastUpdated }',
  );
  if (!doc) {
    throw new Error("Privacy legalPage document not found");
  }

  if (doc.body.some((block) => block._key === CLARITY_BLOCK_KEY)) {
    console.log("Clarity block already present — nothing to do.");
    return;
  }

  // Insert immediately after the Mixpanel block so the analytics processors
  // sit together in the bullet list.
  const mixpanelIndex = doc.body.findIndex(
    (block) => block._key === MIXPANEL_BLOCK_KEY,
  );
  if (mixpanelIndex === -1) {
    throw new Error(
      "Could not locate Mixpanel block — run migrate-privacy-mixpanel first or update this script",
    );
  }

  const newBody: Block[] = [...doc.body];
  newBody.splice(mixpanelIndex + 1, 0, clarityProcessorBlock());

  console.log(
    `Patching legalPage-privacy: +1 block (Clarity), lastUpdated ${doc.lastUpdated} -> ${NEW_LAST_UPDATED}`,
  );

  await client
    .patch(doc._id)
    .set({ body: newBody, lastUpdated: NEW_LAST_UPDATED })
    .commit();

  const verify = await client.fetch<LegalPageDoc>(
    `*[_id == $id][0]{ _id, body, lastUpdated }`,
    { id: doc._id },
  );
  const hasClarity = verify.body.some(
    (block) => block._key === CLARITY_BLOCK_KEY,
  );
  if (!hasClarity) {
    throw new Error("Clarity block not found after patch — write may have failed");
  }
  if (verify.lastUpdated !== NEW_LAST_UPDATED) {
    throw new Error(`lastUpdated did not update (got ${verify.lastUpdated})`);
  }
  console.log("Verified: Clarity block landed; lastUpdated bumped.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
