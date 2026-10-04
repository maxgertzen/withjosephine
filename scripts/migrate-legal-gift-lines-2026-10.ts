#!/usr/bin/env tsx

import {
  REFUND_POLICY_GIFT_LINE,
  TERMS_GIFT_LINES,
  US_BASED_PROCESSORS,
} from "../src/components/LegalPageLayout/legalLines";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-legal-gift-lines";

type Span = { _key: string; text?: string };
type Block = { _key: string; children?: Span[] };

export type LegalPageDoc = {
  _id: string;
  _rev: string;
  lastUpdated?: string;
  body?: Block[];
};

export type LegalLineEdit = { pageId: string; anchor: string; replacement: string };

export const LEGAL_LINE_EDITS: readonly LegalLineEdit[] = [
  {
    pageId: "legalPage-terms",
    anchor: "has consented to having a reading done for them.",
    replacement: `has consented to having a reading done for them. ${TERMS_GIFT_LINES}`,
  },
  {
    pageId: "legalPage-refund-policy",
    anchor: "all sales are final once payment is complete.",
    replacement: `all sales are final once payment is complete. ${REFUND_POLICY_GIFT_LINE}`,
  },
  {
    pageId: "legalPage-privacy",
    anchor: "(Stripe, Sanity, Mixpanel, Microsoft)",
    replacement: `(${US_BASED_PROCESSORS})`,
  },
];

export type LegalPagePlan =
  | { outcome: "empty-body" | "already-applied" | "anchor-not-found" }
  | { outcome: "patch"; set: Record<string, string>; oldText: string };

const spansOf = (body: readonly Block[]) =>
  body.flatMap((block) => (block.children ?? []).map((span) => ({ block, span })));

export function planLegalPage(
  doc: LegalPageDoc,
  edit: LegalLineEdit,
  today: string,
): LegalPagePlan {
  const spans = spansOf(doc.body ?? []);
  if (spans.length === 0) return { outcome: "empty-body" };
  if (spans.some(({ span }) => span.text?.includes(edit.replacement))) {
    return { outcome: "already-applied" };
  }
  const target = spans.find(({ span }) => span.text?.includes(edit.anchor));
  if (!target?.span.text) return { outcome: "anchor-not-found" };

  const spanPath = `body[_key=="${target.block._key}"].children[_key=="${target.span._key}"].text`;
  const set: Record<string, string> = {
    [spanPath]: target.span.text.replace(edit.anchor, edit.replacement),
  };
  if (!doc.lastUpdated || doc.lastUpdated < today) set.lastUpdated = today;
  return { outcome: "patch", set, oldText: target.span.text };
}

const log = (message: string) => console.log(`[${LOG_PREFIX}] ${message}`);

const publishedId = (id: string) => id.replace(/^drafts\./, "");

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  log(`dataset=${opts.dataset} apply=${opts.apply}`);
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const pageIds = LEGAL_LINE_EDITS.map((edit) => edit.pageId);
  const docs = await client.fetch<LegalPageDoc[]>(
    `*[_id in $ids]{ _id, _rev, lastUpdated, body }`,
    { ids: [...pageIds, ...pageIds.map((id) => `drafts.${id}`)] },
  );

  const today = new Date().toISOString().slice(0, 10);
  const patches: Array<{ doc: LegalPageDoc; set: Record<string, string> }> = [];
  for (const edit of LEGAL_LINE_EDITS) {
    const pageDocs = docs.filter((doc) => publishedId(doc._id) === edit.pageId);
    if (pageDocs.length === 0) log(`${edit.pageId}: not in the dataset, the code fallback renders`);
    for (const doc of pageDocs) {
      const plan = planLegalPage(doc, edit, today);
      if (plan.outcome !== "patch") {
        log(`${doc._id}: ${plan.outcome}`);
        if (plan.outcome === "anchor-not-found") process.exitCode = 1;
        continue;
      }
      log(`${doc._id}: before: ${plan.oldText}`);
      for (const [path, value] of Object.entries(plan.set))
        log(`${doc._id}: set ${path} = ${value}`);
      patches.push({ doc, set: plan.set });
    }
  }

  log(`${patches.length} documents to patch`);
  if (!opts.apply || patches.length === 0) return;

  const transaction = client.transaction();
  for (const { doc, set } of patches) {
    transaction.patch(doc._id, (patch) => patch.ifRevisionId(doc._rev).set(set));
  }
  await transaction.commit();
  log(`patched ${patches.map(({ doc }) => doc._id).join(", ")}`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      "Usage: pnpm tsx scripts/migrate-legal-gift-lines-2026-10.ts staging|production [--apply]",
    );
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
