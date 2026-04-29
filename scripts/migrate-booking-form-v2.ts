/**
 * Migrate the bookingForm singleton + formSection docs for the booking-flow
 * v2 rebuild (PR-A).
 *
 * Idempotent. Field-level setIfMissing — never overwrites Studio edits.
 * Defaults to dry-run; pass --apply to actually write to Sanity.
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/migrate-booking-form-v2.ts
 *   set -a && source .env.local && set +a && pnpm tsx scripts/migrate-booking-form-v2.ts --apply
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SanityClient } from "@sanity/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

type PortableTextSpan = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

type PortableTextLinkMarkDef = {
  _type: "link";
  _key: string;
  href: string;
};

type PortableTextBlock = {
  _type: "block";
  _key: string;
  style: "normal";
  markDefs: PortableTextLinkMarkDef[];
  children: PortableTextSpan[];
};

type ConsentRow = {
  _type: "consentRow";
  _key: string;
  key: "entertainment" | "cooling_off" | "terms_privacy" | "newsletter";
  required: boolean;
  labelRichText: PortableTextBlock[];
  helperText: string;
  optionalCaption: string;
};

type ConsentBlock = {
  _type: "consentBlock";
  trustLine: string;
  hairlineBeforeKey: string;
  rows: ConsentRow[];
};

type EntryPageContent = {
  letterOpener?: string;
  letterBridge?: string;
  letterClosing?: string;
  dropCapCta?: string;
  dropCapCaption?: string;
  changeReadingLinkText?: string;
  aboutJosephineLinkText?: string;
};

type ExistingBookingForm = {
  _id: string;
  _type: "bookingForm";
  nonRefundableNotice?: string;
  entryPageContent?: EntryPageContent;
  consentBlock?: ConsentBlock;
  pagination?: { overrides?: unknown[] };
  loadingStateCopy?: string;
  swapToastCopy?: string;
};

type ExistingFormSection = {
  _id: string;
  _type: "formSection";
  sectionTitle?: string;
  pageBoundary?: boolean;
  marginaliaLabel?: string;
};

type PlannedMutation = {
  docId: string;
  patch: Record<string, unknown>;
};

type MigrationLog = {
  runMode: "dry-run" | "apply";
  timestamp: string;
  mutations: PlannedMutation[];
};

const BOOKING_FORM_ID = "bookingForm";
const LOG_PATH = resolve(__dirname, "migration-log-v2.json");

const ENTRY_PAGE_VERBATIM: Required<EntryPageContent> = {
  letterOpener:
    "Before I read for you, I want to know a little about you. A few details, a few questions you'd like held.",
  letterBridge: "Take your time with this. There's no wrong answer.",
  letterClosing:
    "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
  dropCapCta: "Tell me about you →",
  dropCapCaption:
    "The intake form — about five minutes. You'll review before paying.",
  changeReadingLinkText: "Reading a different one? See all three →",
  aboutJosephineLinkText: "About Josephine",
};

const CONSENT_TRUST_LINE =
  "Every reading is read by me, written by me, and made only for you. There's no template underneath.";

const CONSENT_ENTERTAINMENT_TEXT =
  "I understand that this reading is provided for entertainment purposes only. It is not a substitute for medical, psychological, legal, or financial advice. I will not rely on it as a factual prediction or guarantee of future outcomes.";

const CONSENT_COOLING_OFF_FALLBACK =
  "I agree that Josephine may begin preparing my reading immediately, and I understand I will lose my right to cancel for a refund once I submit the intake form.";

const CONSENT_NEWSLETTER_TEXT =
  "I'd love to hear from Josephine about new readings and writings. You can unsubscribe anytime.";

const LOADING_STATE_COPY = "One moment — taking you to checkout.";
const SWAP_TOAST_COPY =
  "Switched to {readingName}. Your name and email are saved — start where you left off.";

function plainPortableTextBlock(blockKey: string, text: string): PortableTextBlock {
  return {
    _type: "block",
    _key: blockKey,
    style: "normal",
    markDefs: [],
    children: [
      { _type: "span", _key: `${blockKey}_s0`, text, marks: [] },
    ],
  };
}

function termsPrivacyPortableTextBlock(blockKey: string): PortableTextBlock {
  const termsKey = `${blockKey}_terms`;
  const privacyKey = `${blockKey}_privacy`;
  return {
    _type: "block",
    _key: blockKey,
    style: "normal",
    markDefs: [
      { _type: "link", _key: termsKey, href: "/terms" },
      { _type: "link", _key: privacyKey, href: "/privacy" },
    ],
    children: [
      { _type: "span", _key: `${blockKey}_s0`, text: "I agree to the ", marks: [] },
      { _type: "span", _key: `${blockKey}_s1`, text: "Terms & Conditions", marks: [termsKey] },
      { _type: "span", _key: `${blockKey}_s2`, text: " and ", marks: [] },
      { _type: "span", _key: `${blockKey}_s3`, text: "Privacy Policy", marks: [privacyKey] },
      { _type: "span", _key: `${blockKey}_s4`, text: ".", marks: [] },
    ],
  };
}

function buildConsentRows(coolingOffText: string): ConsentRow[] {
  return [
    {
      _type: "consentRow",
      _key: "row_entertainment",
      key: "entertainment",
      required: true,
      labelRichText: [plainPortableTextBlock("blk_entertainment", CONSENT_ENTERTAINMENT_TEXT)],
      helperText: "",
      optionalCaption: "",
    },
    {
      _type: "consentRow",
      _key: "row_cooling_off",
      key: "cooling_off",
      required: true,
      labelRichText: [plainPortableTextBlock("blk_cooling_off", coolingOffText)],
      helperText: "",
      optionalCaption: "",
    },
    {
      _type: "consentRow",
      _key: "row_terms_privacy",
      key: "terms_privacy",
      required: true,
      labelRichText: [termsPrivacyPortableTextBlock("blk_terms_privacy")],
      helperText: "",
      optionalCaption: "",
    },
    {
      _type: "consentRow",
      _key: "row_newsletter",
      key: "newsletter",
      required: false,
      labelRichText: [plainPortableTextBlock("blk_newsletter", CONSENT_NEWSLETTER_TEXT)],
      helperText: "",
      optionalCaption: "Optional",
    },
  ];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function planEntryPageFields(
  existing: EntryPageContent | undefined,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [field, verbatim] of Object.entries(ENTRY_PAGE_VERBATIM) as Array<
    [keyof EntryPageContent, string]
  >) {
    const currentValue = existing?.[field];
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      patch[`entryPageContent.${field}`] = verbatim;
    }
  }
  return patch;
}

function planConsentBlockMutations(
  existing: ExistingBookingForm,
): PlannedMutation[] {
  const coolingOffText =
    existing.nonRefundableNotice && existing.nonRefundableNotice.trim().length > 0
      ? existing.nonRefundableNotice.trim()
      : CONSENT_COOLING_OFF_FALLBACK;

  if (!existing.consentBlock) {
    const consentBlock: ConsentBlock = {
      _type: "consentBlock",
      trustLine: CONSENT_TRUST_LINE,
      hairlineBeforeKey: "newsletter",
      rows: buildConsentRows(coolingOffText),
    };
    return [{ docId: BOOKING_FORM_ID, patch: { consentBlock } }];
  }

  const coolingOffRow = existing.consentBlock.rows?.find(
    (row) => row.key === "cooling_off",
  );
  const coolingOffMissing =
    coolingOffRow !== undefined &&
    (!coolingOffRow.labelRichText || coolingOffRow.labelRichText.length === 0);

  if (!coolingOffMissing) return [];

  return [
    {
      docId: BOOKING_FORM_ID,
      patch: {
        [`consentBlock.rows[_key=="${coolingOffRow._key}"].labelRichText`]: [
          plainPortableTextBlock("blk_cooling_off", coolingOffText),
        ],
      },
    },
  ];
}

function isAbsent(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function planSimpleFields(existing: ExistingBookingForm): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (isAbsent(existing.pagination)) {
    patch.pagination = { overrides: [] };
  }
  if (isAbsent(existing.loadingStateCopy)) {
    patch.loadingStateCopy = LOADING_STATE_COPY;
  }
  if (isAbsent(existing.swapToastCopy)) {
    patch.swapToastCopy = SWAP_TOAST_COPY;
  }

  return patch;
}

function planBookingFormMutations(existing: ExistingBookingForm): PlannedMutation[] {
  const coalesced: Record<string, unknown> = {
    ...planEntryPageFields(existing.entryPageContent),
    ...planSimpleFields(existing),
  };
  const result: PlannedMutation[] = [];
  if (Object.keys(coalesced).length > 0) {
    result.push({ docId: BOOKING_FORM_ID, patch: coalesced });
  }
  result.push(...planConsentBlockMutations(existing));
  return result;
}

function planFormSectionMutations(
  sections: ExistingFormSection[],
): PlannedMutation[] {
  const planned: PlannedMutation[] = [];
  for (const section of sections) {
    const patch: Record<string, unknown> = {};
    if (isAbsent(section.pageBoundary)) {
      patch.pageBoundary = false;
    }
    if (isAbsent(section.marginaliaLabel)) {
      const derived = slugify(section.sectionTitle ?? section._id);
      if (derived.length > 0) {
        patch.marginaliaLabel = derived;
      }
    }
    if (Object.keys(patch).length > 0) {
      planned.push({ docId: section._id, patch });
    }
  }
  return planned;
}

async function applyMutations(
  client: SanityClient,
  mutations: PlannedMutation[],
): Promise<number> {
  if (mutations.length === 0) return 0;
  const transaction = client.transaction();
  for (const mutation of mutations) {
    transaction.patch(mutation.docId, (patch) => patch.setIfMissing(mutation.patch));
  }
  await transaction.commit();
  return mutations.length;
}

async function main(): Promise<void> {
  const isApply = process.argv.includes("--apply");
  const runMode: MigrationLog["runMode"] = isApply ? "apply" : "dry-run";

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(` migrate-booking-form-v2 — runMode: ${runMode}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const projectId = requireEnv("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

  if (isApply) {
    requireEnv("SANITY_WRITE_TOKEN");
  }

  const readClient = createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    useCdn: false,
  });

  console.log("\n[1/4] Fetching existing bookingForm singleton...");
  const existingForm = await readClient.fetch<ExistingBookingForm | null>(
    `*[_type == "bookingForm" && _id == $id][0]{
      _id,
      _type,
      nonRefundableNotice,
      entryPageContent,
      consentBlock,
      pagination,
      loadingStateCopy,
      swapToastCopy
    }`,
    { id: BOOKING_FORM_ID },
  );
  if (!existingForm) {
    throw new Error(
      `bookingForm doc with _id "${BOOKING_FORM_ID}" not found. Run seed-booking-form.ts first.`,
    );
  }
  console.log(`  found bookingForm (nonRefundableNotice: ${existingForm.nonRefundableNotice ? "present" : "empty"})`);

  console.log("\n[2/4] Fetching all formSection docs...");
  const existingSections = await readClient.fetch<ExistingFormSection[]>(
    `*[_type == "formSection"]{
      _id,
      _type,
      sectionTitle,
      pageBoundary,
      marginaliaLabel
    }`,
  );
  console.log(`  found ${existingSections.length} formSection doc(s)`);

  console.log("\n[3/4] Computing planned mutations...");
  const mutations: PlannedMutation[] = [
    ...planBookingFormMutations(existingForm),
    ...planFormSectionMutations(existingSections),
  ];

  for (const mutation of mutations) {
    const keys = Object.keys(mutation.patch).join(", ");
    console.log(`  PLAN setIfMissing ${mutation.docId} :: ${keys}`);
  }

  const log: MigrationLog = {
    runMode,
    timestamp: new Date().toISOString(),
    mutations,
  };
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n", "utf8");
  console.log(`\n  log written → ${LOG_PATH}`);

  console.log("\n[4/4] Apply phase...");
  let appliedCount = 0;
  if (!isApply) {
    console.log("  (dry-run — skipping writes; pass --apply to execute)");
  } else if (mutations.length === 0) {
    console.log("  no mutations to apply");
  } else {
    const writeClient = createClient({
      projectId,
      dataset,
      apiVersion: "2025-01-01",
      useCdn: false,
      token: process.env.SANITY_WRITE_TOKEN,
    });
    appliedCount = await applyMutations(writeClient, mutations);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(` ${mutations.length} mutation(s) planned`);
  console.log(` ${appliedCount} mutation(s) applied`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nFAILED: ${message}`);
  process.exit(1);
});
