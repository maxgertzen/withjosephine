#!/usr/bin/env tsx

import { isDeliverable } from "../src/lib/booking/persistence/isDeliverable";
import { isSandboxEmail } from "../src/lib/booking/sandboxEmails";

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "request-send-for-hand-set-delivered";

export const HAND_SET_DELIVERED_GROQ = `*[_type == "submission"
  && !(_id in path("drafts.**"))
  && status == "paid"
  && defined(deliveredAt)
  && !defined(deliveryRequestedAt)
  && coalesce(count(emailsFired[type == "day7"]), 0) == 0
]{
  _id,
  email,
  deliveredAt,
  "voiceNoteUrl": voiceNote.asset->url,
  "pdfUrl": readingPdf.asset->url
}`;

export type HandSetDeliveredDoc = {
  _id: string;
  email: string | null;
  deliveredAt: string;
  voiceNoteUrl?: string;
  pdfUrl?: string;
};

export type HandSetDeliveredPlan = {
  toRequest: HandSetDeliveredDoc[];
  missingFiles: HandSetDeliveredDoc[];
  sandbox: HandSetDeliveredDoc[];
};

export function planHandSetDelivered(docs: readonly HandSetDeliveredDoc[]): HandSetDeliveredPlan {
  const plan: HandSetDeliveredPlan = { toRequest: [], missingFiles: [], sandbox: [] };
  for (const doc of docs) {
    if (isSandboxEmail(doc.email)) plan.sandbox.push(doc);
    else if (!isDeliverable(doc)) plan.missingFiles.push(doc);
    else plan.toRequest.push(doc);
  }
  return plan;
}

const log = (message: string) => console.log(`[${LOG_PREFIX}] ${message}`);

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = sanityWriteClient({ dataset: opts.dataset });
  const docs = await client.fetch<HandSetDeliveredDoc[]>(HAND_SET_DELIVERED_GROQ);
  const plan = planHandSetDelivered(docs);
  log(`dataset=${opts.dataset} apply=${opts.apply}`);
  for (const doc of plan.toRequest) log(`request ${doc._id} (deliveredAt ${doc.deliveredAt})`);
  for (const doc of plan.missingFiles) log(`left alone, files missing: ${doc._id}`);
  for (const doc of plan.sandbox) log(`left alone, sandbox address: ${doc._id}`);
  log(
    `${docs.length} found, ${plan.toRequest.length} to request, ${plan.missingFiles.length} missing files, ${plan.sandbox.length} sandbox`,
  );
  if (!opts.apply || plan.toRequest.length === 0) return;

  const requestedAt = new Date().toISOString();
  const transaction = client.transaction();
  for (const doc of plan.toRequest) {
    transaction.patch(doc._id, (patch) =>
      patch.set({ deliveryRequestedAt: requestedAt }).unset(["deliveryFailedAt"]),
    );
  }
  await transaction.commit();
  log(`set deliveryRequestedAt=${requestedAt} on ${plan.toRequest.length} submissions`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      "Usage: pnpm tsx scripts/request-send-for-hand-set-delivered-2026-10.mts staging|production [--apply]",
    );
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
