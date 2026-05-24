import fs from "node:fs";

import { stringToPortableTextBlocks } from "../src/lib/emails/portableTextBuild";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const datasetArg = process.argv[2];
if (!datasetArg) {
  console.error(
    "Usage: pnpm exec tsx scripts/fix-staging-email-pt-fields-2026-05-25.mts <staging|production>",
  );
  process.exit(1);
}

const client = sanityWriteClient({ dataset: datasetArg });

type DocLike = Record<string, unknown> & { _id?: string };

function isPortableTextArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry && typeof entry === "object" && (entry as { _type?: string })._type === "block",
    )
  );
}

function toBlocks(value: unknown) {
  if (value == null) return null;
  if (isPortableTextArray(value)) return value;
  if (typeof value === "string") {
    return value.trim().length === 0 ? null : stringToPortableTextBlocks(value);
  }
  if (Array.isArray(value)) {
    const joined = value.filter((v) => typeof v === "string").join("\n\n");
    return joined.trim().length === 0 ? null : stringToPortableTextBlocks(joined);
  }
  return null;
}

type FixPlan = {
  id: string;
  ptFields: string[];
  unsetFields: string[];
};

const PLANS: FixPlan[] = [
  {
    id: "emailGiftClaim",
    ptFields: ["body", "claimUrlHelper"],
    unsetFields: [
      "bodyFirstSend",
      "greeting",
      "subjectReminder",
      "previewReminder",
      "heroLineReminder",
      "bodyReminder",
      "reminderContactLine",
    ],
  },
  {
    id: "emailGiftClaimReminder",
    ptFields: ["body"],
    unsetFields: [],
  },
  {
    id: "emailGiftPurchaseConfirmationSelfSend",
    ptFields: ["body", "shareUrlHelper", "refundLine"],
    unsetFields: [],
  },
  {
    id: "emailGiftPurchaseConfirmationScheduled",
    ptFields: ["body", "refundLine"],
    unsetFields: [],
  },
];

const SUMMARY = {
  patched: [] as string[],
  skipped: [] as string[],
  failed: [] as { id: string; reason: string }[],
};

for (const plan of PLANS) {
  const doc = (await client.getDocument(plan.id)) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: plan.id, reason: "doc does not exist" });
    continue;
  }

  const setPatches: Record<string, unknown> = {};
  let needsSet = false;
  for (const field of plan.ptFields) {
    const value = doc[field];
    if (isPortableTextArray(value)) continue;
    const blocks = toBlocks(value);
    if (blocks) {
      setPatches[field] = blocks;
      needsSet = true;
    } else {
      setPatches[field] = [];
      needsSet = true;
    }
  }

  const unsetList = plan.unsetFields.filter((field) => doc[field] !== undefined);

  if (!needsSet && unsetList.length === 0) {
    SUMMARY.skipped.push(`${plan.id} (clean)`);
    continue;
  }

  let p = client.patch(plan.id);
  if (needsSet) p = p.set(setPatches);
  if (unsetList.length > 0) p = p.unset(unsetList);
  await p.commit();
  SUMMARY.patched.push(
    `${plan.id} (set: ${Object.keys(setPatches).join(", ") || "—"}; unset: ${unsetList.join(", ") || "—"})`,
  );
}

console.log(`Done against dataset "${datasetArg}".`);
console.log(`Patched: ${SUMMARY.patched.length}`);
for (const entry of SUMMARY.patched) console.log(`  + ${entry}`);
console.log(`Skipped: ${SUMMARY.skipped.length}`);
for (const entry of SUMMARY.skipped) console.log(`  - ${entry}`);
console.log(`Failed: ${SUMMARY.failed.length}`);
for (const entry of SUMMARY.failed) console.log(`  ! ${entry.id}: ${entry.reason}`);
