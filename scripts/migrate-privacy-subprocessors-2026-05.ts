// Reconcile the live privacy policy with what the codebase actually does
// (audit findings 2026-05-11). Six block-level operations on `legalPage-privacy`:
//
//   1. priv-b8  (Payment information)  — expand "what Josephine receives" to
//                                        include amount, currency, country.
//   2. priv-b14 (Stripe sub-processor) — add EU-US DPF + SCCs disclosure.
//   3. priv-b15 (Web3Forms)            — REMOVE. Code migrated to Resend long ago.
//   4. priv-b18 (Sanity)               — drop "No customer data lives in Sanity";
//                                        disclose intake answers / photos / voice
//                                        notes / PDFs now stored in Sanity (Sub-PR #4a).
//   5. priv-b19 (Cloudflare)           — replace "DNS, email routing, edge hosting
//                                        (Cloudflare Pages)" with the actual surfaces:
//                                        Workers (not Pages), DNS, Email Routing,
//                                        D1, R2, Turnstile.
//   6. Insert  priv-resend-2026-05     — Resend sub-processor (transactional + contact form).
//   7. Insert  priv-sentry-2026-05     — Sentry sub-processor (error monitoring).
//
// Each operation is independently idempotent: in-place text updates check a
// marker substring, block insertions check the block key, and the Web3Forms
// removal is a no-op if the block is already absent. `lastUpdated` is only
// bumped if at least one operation mutated something.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-privacy-subprocessors-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-privacy-subprocessors-2026-05.ts
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

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

const NEW_LAST_UPDATED = "2026-05-11";
const RESEND_KEY = "priv-resend-2026-05";
const SENTRY_KEY = "priv-sentry-2026-05";
const CLARITY_KEY = "priv-clarity-2026-05";
const WEB3FORMS_KEY = "priv-b15";

// Idempotency markers — substrings present in the NEW text but absent in the
// CURRENT text. Picked deliberately so a re-run can detect "already updated".
// Markers scoped per-block (we only test the target block's text, never the whole
// document), but picked to be specific enough that a future global-search refactor
// wouldn't false-positive against unrelated blocks.
const STRIPE_B14_MARKER = "Stripe is headquartered";
const STRIPE_B8_MARKER = "billing country";
const SANITY_B18_MARKER = "intake form answers";
const CLOUDFLARE_B19_MARKER = "Cloudflare Workers";

const RESEND_PRIVACY_URL = "https://resend.com/legal/privacy-policy";
const SENTRY_PRIVACY_URL = "https://sentry.io/privacy/";
const STRIPE_PRIVACY_URL = "https://stripe.com/privacy";

function resendBlock(): Block {
  return {
    _type: "block",
    _key: RESEND_KEY,
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [
      {
        _type: "link",
        _key: `${RESEND_KEY}-link`,
        href: RESEND_PRIVACY_URL,
      },
    ],
    children: [
      {
        _type: "span",
        _key: `${RESEND_KEY}-s0`,
        text: "Resend",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: `${RESEND_KEY}-s1`,
        text:
          " — sends the customer-facing emails about your booking (order confirmation, the day-2 update, the day-7 delivery of your voice note and PDF, and any reminder if the reading runs late) and relays the contact-form messages to Josephine. Hosted in the United States by Resend, Inc.; data is transferred under the EU–US Data Privacy Framework and Standard Contractual Clauses. Only your email address and the contents of the email itself are shared with Resend — no payment data and no intake answers beyond what already appears in the email you receive. See ",
        marks: [],
      },
      {
        _type: "span",
        _key: `${RESEND_KEY}-s2`,
        text: "Resend’s privacy policy",
        marks: [`${RESEND_KEY}-link`],
      },
      {
        _type: "span",
        _key: `${RESEND_KEY}-s3`,
        text: ".",
        marks: [],
      },
    ],
  };
}

function sentryBlock(): Block {
  return {
    _type: "block",
    _key: SENTRY_KEY,
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [
      {
        _type: "link",
        _key: `${SENTRY_KEY}-link`,
        href: SENTRY_PRIVACY_URL,
      },
    ],
    children: [
      {
        _type: "span",
        _key: `${SENTRY_KEY}-s0`,
        text: "Sentry",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: `${SENTRY_KEY}-s1`,
        text:
          " — captures application errors so Josephine can diagnose problems with the site. The error report includes the JavaScript stack trace, the page URL (with the per-reading delivery token redacted), and your browser version. Cookies, the Authorization header, and any cron-bearer secret are stripped from the report before it leaves your browser or the server. No form contents, no payment data, and no personal identifiers are sent. Hosted in the United States by Functional Software, Inc.; data is transferred under the EU–US Data Privacy Framework and Standard Contractual Clauses. See ",
        marks: [],
      },
      {
        _type: "span",
        _key: `${SENTRY_KEY}-s2`,
        text: "Sentry’s privacy policy",
        marks: [`${SENTRY_KEY}-link`],
      },
      {
        _type: "span",
        _key: `${SENTRY_KEY}-s3`,
        text: ".",
        marks: [],
      },
    ],
  };
}

// The rewrite* functions return a fresh Block, fully replacing the original.
// Span-level merging is not safe here because the new text reorganizes content
// (e.g. priv-b14 grows from 4 spans to 4 spans but with the DPF clause inserted
// mid-sentence — span indices don't correspond). The per-block idempotency
// markers gate re-runs so a second invocation can't clobber post-migration
// edits Becky has made in Studio.
function rewriteB8(): Block {
  return {
    _type: "block",
    _key: "priv-b8",
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "priv-b8-s0",
        text: "Payment information",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: "priv-b8-s1",
        text:
          " — handled entirely by Stripe. Josephine never sees your card number, CVV, or full billing address. She receives a confirmation that you paid, the amount and currency, your billing country, and the email you used at checkout.",
        marks: [],
      },
    ],
  };
}

function rewriteB14(): Block {
  return {
    _type: "block",
    _key: "priv-b14",
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [
      {
        _type: "link",
        _key: "priv-b14-m2",
        href: STRIPE_PRIVACY_URL,
      },
    ],
    children: [
      {
        _type: "span",
        _key: "priv-b14-s0",
        text: "Stripe",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: "priv-b14-s1",
        text:
          " — processes your payment. Stripe is headquartered in the United States; data is transferred under the EU–US Data Privacy Framework and Standard Contractual Clauses. See ",
        marks: [],
      },
      {
        _type: "span",
        _key: "priv-b14-s2",
        text: "Stripe’s privacy policy",
        marks: ["priv-b14-m2"],
      },
      {
        _type: "span",
        _key: "priv-b14-s3",
        text: ".",
        marks: [],
      },
    ],
  };
}

function rewriteB18(): Block {
  return {
    _type: "block",
    _key: "priv-b18",
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "priv-b18-s0",
        text: "Sanity",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: "priv-b18-s1",
        text:
          " — content management system for the editable parts of the site (page copy, FAQ, branding). After a booking, your intake form answers, your photograph (when the reading requires one), the delivered voice note, and the supporting PDF are also stored in Sanity so Josephine can prepare and deliver your reading from a single workflow surface. Hosted in the European Union (Frankfurt).",
        marks: [],
      },
    ],
  };
}

function rewriteB19(): Block {
  return {
    _type: "block",
    _key: "priv-b19",
    style: "normal",
    level: 1,
    listItem: "bullet",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "priv-b19-s0",
        text: "Cloudflare",
        marks: ["strong"],
      },
      {
        _type: "span",
        _key: "priv-b19-s1",
        text:
          " — provides DNS, Email Routing, edge hosting (Cloudflare Workers), Turnstile (the invisible anti-bot challenge on the booking and contact forms), and storage of your booking record, intake answers, photograph, voice note, and supporting PDF (Cloudflare D1 and R2). Cloudflare also handles abuse protection at the network edge, which incidentally logs IP address, browser, and referrer.",
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

  const newBody: Block[] = [...doc.body];
  let mutated = false;
  const log: string[] = [];

  // --- 1. priv-b8 (Payment information) — expand "what Josephine receives" ---
  const b8Idx = newBody.findIndex((b) => b._key === "priv-b8");
  if (b8Idx !== -1) {
    const b8 = newBody[b8Idx];
    const b8Text = b8.children.map((c) => c.text).join("");
    if (!b8Text.includes(STRIPE_B8_MARKER)) {
      newBody[b8Idx] = rewriteB8();
      mutated = true;
      log.push("priv-b8 (Payment info) rewritten: amount/currency/country added");
    } else {
      log.push("priv-b8 (Payment info) already up to date — skipped");
    }
  } else {
    log.push("priv-b8 (Payment info) not found — skipped");
  }

  // --- 2. priv-b14 (Stripe sub-processor) — add DPF + SCCs disclosure ---
  const b14Idx = newBody.findIndex((b) => b._key === "priv-b14");
  if (b14Idx !== -1) {
    const b14 = newBody[b14Idx];
    const b14Text = b14.children.map((c) => c.text).join("");
    if (!b14Text.includes(STRIPE_B14_MARKER)) {
      newBody[b14Idx] = rewriteB14();
      mutated = true;
      log.push("priv-b14 (Stripe) rewritten: EU-US DPF + SCCs added");
    } else {
      log.push("priv-b14 (Stripe) already up to date — skipped");
    }
  } else {
    log.push("priv-b14 (Stripe) not found — skipped");
  }

  // --- 3. priv-b15 (Web3Forms) — REMOVE ---
  const b15Idx = newBody.findIndex((b) => b._key === WEB3FORMS_KEY);
  if (b15Idx !== -1) {
    newBody.splice(b15Idx, 1);
    mutated = true;
    log.push("priv-b15 (Web3Forms) removed");
  } else {
    log.push("priv-b15 (Web3Forms) already absent — skipped");
  }

  // --- 4. priv-b18 (Sanity) — disclose intake/photo/voice/PDF storage ---
  const b18Idx = newBody.findIndex((b) => b._key === "priv-b18");
  if (b18Idx !== -1) {
    const b18 = newBody[b18Idx];
    const b18Text = b18.children.map((c) => c.text).join("");
    if (!b18Text.includes(SANITY_B18_MARKER)) {
      newBody[b18Idx] = rewriteB18();
      mutated = true;
      log.push("priv-b18 (Sanity) rewritten: customer-data storage disclosed");
    } else {
      log.push("priv-b18 (Sanity) already up to date — skipped");
    }
  } else {
    log.push("priv-b18 (Sanity) not found — skipped");
  }

  // --- 5. priv-b19 (Cloudflare) — Workers + D1 + R2 + Turnstile + KV ---
  const b19Idx = newBody.findIndex((b) => b._key === "priv-b19");
  if (b19Idx !== -1) {
    const b19 = newBody[b19Idx];
    const b19Text = b19.children.map((c) => c.text).join("");
    if (!b19Text.includes(CLOUDFLARE_B19_MARKER)) {
      newBody[b19Idx] = rewriteB19();
      mutated = true;
      log.push("priv-b19 (Cloudflare) rewritten: D1/R2/Turnstile/Workers disclosed");
    } else {
      log.push("priv-b19 (Cloudflare) already up to date — skipped");
    }
  } else {
    log.push("priv-b19 (Cloudflare) not found — skipped");
  }

  // --- 6. Insert Resend block AFTER priv-b19 (Cloudflare), so the processor
  //        list reads: Stripe → Gmail → Sanity → Cloudflare → Resend → analytics.
  if (!newBody.some((b) => b._key === RESEND_KEY)) {
    const cfIdx = newBody.findIndex((b) => b._key === "priv-b19");
    if (cfIdx === -1) {
      throw new Error("priv-b19 (Cloudflare) not found — cannot anchor Resend insertion");
    }
    newBody.splice(cfIdx + 1, 0, resendBlock());
    mutated = true;
    log.push(`${RESEND_KEY} (Resend) inserted after priv-b19`);
  } else {
    log.push(`${RESEND_KEY} already present — skipped`);
  }

  // --- 7. Insert Sentry block AFTER priv-clarity-2026-05, so the observability
  //        sub-processors (Mixpanel → Clarity → Sentry) sit together at the end.
  if (!newBody.some((b) => b._key === SENTRY_KEY)) {
    const clarityIdx = newBody.findIndex((b) => b._key === CLARITY_KEY);
    if (clarityIdx === -1) {
      throw new Error(
        "priv-clarity-2026-05 not found — run migrate-privacy-clarity first or update this script",
      );
    }
    newBody.splice(clarityIdx + 1, 0, sentryBlock());
    mutated = true;
    log.push(`${SENTRY_KEY} (Sentry) inserted after ${CLARITY_KEY}`);
  } else {
    log.push(`${SENTRY_KEY} already present — skipped`);
  }

  console.log(log.map((l) => `  • ${l}`).join("\n"));

  if (!mutated) {
    console.log("All sub-processor blocks already up to date — nothing to do.");
    return;
  }

  // Only advance lastUpdated; never set it backwards. Protects against re-running
  // this migration after a future-dated manual edit lands in Studio.
  const shouldBumpLastUpdated = doc.lastUpdated < NEW_LAST_UPDATED;
  const patch = client.patch(doc._id);
  if (shouldBumpLastUpdated) {
    patch.set({ body: newBody, lastUpdated: NEW_LAST_UPDATED });
    console.log(
      `Patching legalPage-privacy (${doc._id}); lastUpdated ${doc.lastUpdated} -> ${NEW_LAST_UPDATED}`,
    );
  } else {
    patch.set({ body: newBody });
    console.log(
      `Patching legalPage-privacy (${doc._id}); leaving lastUpdated at ${doc.lastUpdated} (already >= ${NEW_LAST_UPDATED})`,
    );
  }
  await patch.commit();

  const verify = await client.fetch<LegalPageDoc>(
    `*[_id == $id][0]{ _id, body, lastUpdated }`,
    { id: doc._id },
  );
  const hasResend = verify.body.some((b) => b._key === RESEND_KEY);
  const hasSentry = verify.body.some((b) => b._key === SENTRY_KEY);
  const hasWeb3 = verify.body.some((b) => b._key === WEB3FORMS_KEY);
  const b14Updated = verify.body.find((b) => b._key === "priv-b14");
  const b14HasDPF = b14Updated?.children
    .map((c) => c.text)
    .join("")
    .includes(STRIPE_B14_MARKER);
  if (!hasResend) throw new Error("Verification failed: Resend block missing after patch");
  if (!hasSentry) throw new Error("Verification failed: Sentry block missing after patch");
  if (hasWeb3) throw new Error("Verification failed: Web3Forms block still present after patch");
  if (!b14HasDPF) throw new Error("Verification failed: Stripe DPF disclosure missing after patch");
  if (shouldBumpLastUpdated && verify.lastUpdated !== NEW_LAST_UPDATED) {
    throw new Error(`lastUpdated did not update (got ${verify.lastUpdated})`);
  }
  console.log("Verified: Resend + Sentry present, Web3Forms gone, Stripe DPF present.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
