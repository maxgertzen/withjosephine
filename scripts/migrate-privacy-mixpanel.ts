/**
 * Splice Mixpanel sub-processor disclosure into the live privacy policy
 * document in Sanity. Idempotent: re-running checks for the inserted
 * Mixpanel block by `_key` and skips if already present.
 *
 * Changes (PR-F1, 2026-05-02):
 *   1. Insert a new Mixpanel processor block in the "Who it's shared
 *      with" section, between Cloudflare and the closing line.
 *   2. Replace `priv-b9` ("Basic technical data...") to drop the
 *      now-false sentence "No analytics or advertising cookies are
 *      used." Cloudflare's edge logging is unchanged.
 *   3. Replace `priv-b37` ("Cookies & tracking") to disclose Mixpanel,
 *      its localStorage usage, the EU/UK/CH/CA consent banner, and
 *      that there are still no advertising pixels.
 *   4. Replace `priv-b26` ("International access to your data") to add
 *      Mixpanel's US processing under DPF/SCCs.
 *   5. Bump `lastUpdated` to 2026-05-02.
 *
 * Preserves all other blocks verbatim (no gratuitous edits — see the
 * "fetch from Sanity origin first" project rule).
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/migrate-privacy-mixpanel.ts
 */
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

const MIXPANEL_BLOCK_KEY = "priv-mixpanel-2026-05";
const NEW_LAST_UPDATED = "2026-05-02";

function mixpanelProcessorBlock(): Block {
  return {
    _type: "block",
    _key: MIXPANEL_BLOCK_KEY,
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [
      {
        _type: "link",
        _key: `${MIXPANEL_BLOCK_KEY}-link`,
        href: "https://mixpanel.com/legal/privacy-policy/",
      },
    ],
    children: [
      {
        _type: "span",
        _key: `${MIXPANEL_BLOCK_KEY}-s0`,
        text: "Mixpanel",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: `${MIXPANEL_BLOCK_KEY}-s1`,
        text: " — provides anonymous funnel analytics (page views, intake-form interactions, payment success). Hosted in the United States; data is transferred under the EU–US Data Privacy Framework and Standard Contractual Clauses. No personal information (name, email, photographs, birth details) is sent to Mixpanel. Events reference an anonymous browser ID and an opaque submission ID. Visitors in the EU/EEA, UK, Switzerland, and California see a consent banner before any analytics events are recorded; outside those regions, anonymous analytics are recorded by default in line with applicable laws. See ",
        marks: [],
      },
      {
        _type: "span",
        _key: `${MIXPANEL_BLOCK_KEY}-s2`,
        text: "Mixpanel’s privacy policy",
        marks: [`${MIXPANEL_BLOCK_KEY}-link`],
      },
      {
        _type: "span",
        _key: `${MIXPANEL_BLOCK_KEY}-s3`,
        text: ".",
        marks: [],
      },
    ],
  };
}

function replacedTechnicalDataBlock(existing: Block): Block {
  return {
    ...existing,
    children: [
      {
        _type: "span",
        _key: `${existing._key}-s0`,
        text: "Basic technical data",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: `${existing._key}-s1`,
        text: " — IP address, browser, and referrer, logged by Cloudflare for abuse protection.",
        marks: [],
      },
    ],
    markDefs: [],
  };
}

function replacedCookiesBlock(existing: Block): Block {
  return {
    ...existing,
    children: [
      {
        _type: "span",
        _key: `${existing._key}-s0`,
        text: "The site uses Mixpanel for anonymous funnel analytics. Mixpanel stores a randomly generated visitor ID in your browser’s localStorage; it is not used for advertising, profiling, or sale to third parties. Visitors in the EU/EEA, UK, Switzerland, and California see a consent banner first and can decline; outside those regions analytics are recorded by default. There are no advertising pixels and no social-media tracking scripts. The only other persistent storage set by the site itself is whatever your browser keeps for the Stripe checkout session (which is governed by Stripe’s policy).",
        marks: [],
      },
    ],
    markDefs: [],
  };
}

function replacedInternationalBlock(existing: Block): Block {
  return {
    ...existing,
    children: [
      {
        _type: "span",
        _key: `${existing._key}-s0`,
        text: "Josephine works remotely and may access your information from countries outside the United Kingdom and the European Economic Area, including countries that do not have a UK or EU adequacy decision. When that happens, the transfer is necessary for the performance of your booking contract with Josephine (UK GDPR / GDPR Article 49(1)(b)). No customer data is stored on local devices long-term — it lives in Gmail, Google Drive, and Stripe, which are operated under their own international-transfer safeguards. Mixpanel processes anonymous analytics events in the United States under the EU–US Data Privacy Framework and Standard Contractual Clauses; no personal information is included in those events.",
        marks: [],
      },
    ],
    markDefs: [],
  };
}

async function main() {
  const doc = await client.fetch<LegalPageDoc | null>(
    '*[_type == "legalPage" && slug.current == "privacy"][0]{ _id, _rev, body, lastUpdated }',
  );
  if (!doc) {
    throw new Error("Privacy legalPage document not found");
  }

  if (doc.body.some((block) => block._key === MIXPANEL_BLOCK_KEY)) {
    console.log("Mixpanel block already present — nothing to do.");
    return;
  }

  const cloudflareIndex = doc.body.findIndex(
    (block) => block._key === "priv-b19",
  );
  if (cloudflareIndex === -1) {
    throw new Error("Could not locate priv-b19 (Cloudflare block) — aborting");
  }

  const newBody: Block[] = doc.body.map((block) => {
    if (block._key === "priv-b9") return replacedTechnicalDataBlock(block);
    if (block._key === "priv-b37") return replacedCookiesBlock(block);
    if (block._key === "priv-b26") return replacedInternationalBlock(block);
    return block;
  });

  newBody.splice(cloudflareIndex + 1, 0, mixpanelProcessorBlock());

  console.log(`Patching legalPage-privacy: +1 block, 3 replaced, lastUpdated ${doc.lastUpdated} -> ${NEW_LAST_UPDATED}`);

  await client
    .patch(doc._id)
    .set({ body: newBody, lastUpdated: NEW_LAST_UPDATED })
    .commit();

  const verify = await client.fetch<LegalPageDoc>(
    `*[_id == $id][0]{ _id, body, lastUpdated }`,
    { id: doc._id },
  );
  const hasMixpanel = verify.body.some(
    (block) => block._key === MIXPANEL_BLOCK_KEY,
  );
  if (!hasMixpanel) {
    throw new Error("Mixpanel block not found after patch — write may have failed");
  }
  if (verify.lastUpdated !== NEW_LAST_UPDATED) {
    throw new Error(`lastUpdated did not update (got ${verify.lastUpdated})`);
  }
  console.log("Verified: Mixpanel block landed; lastUpdated bumped.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
