import fs from "node:fs";
import { createClient } from "@sanity/client";

// Cleans two classes of drift off submission docs in Sanity:
//
//   1. emailsFired array items written without a `_key` (regression in
//      mirrorAppendEmailFired pre-2026-05-11 — Studio rendered the audit
//      log as a yellow "Missing keys" banner so Becky couldn't see which
//      emails had fired). Backfills a stable key derived from type+sentAt.
//
//   2. Orphan field VALUES on submission docs: `clientReferenceId` and
//      `abandonmentRecoveryFiredAt`. Both were removed from the schema in
//      PR #76 + D1 migration 0003 but Sanity preserved their values,
//      surfacing as "Unknown field found" red warnings in Studio.
//
// Run: pnpm tsx scripts/cleanup-submission-orphans.mts <dataset>
// Default dataset: production. Use "staging" for the staging dataset.

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "production";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

type EmailFiredEntry = {
  _key?: string;
  type: string;
  sentAt: string;
  resendId?: string | null;
};

type SubmissionDriftDoc = {
  _id: string;
  emailsFired?: EmailFiredEntry[];
  clientReferenceId?: string;
  abandonmentRecoveryFiredAt?: string;
};

function sanityKeyForEmailFired(entry: EmailFiredEntry): string {
  return `${entry.type}-${entry.sentAt}`.replace(/[^A-Za-z0-9_-]/g, "-");
}

const docs = await client.fetch<SubmissionDriftDoc[]>(`
  *[_type == "submission" && (
    count(emailsFired[!defined(_key)]) > 0 ||
    defined(clientReferenceId) ||
    defined(abandonmentRecoveryFiredAt)
  )]{
    _id,
    emailsFired,
    clientReferenceId,
    abandonmentRecoveryFiredAt
  }
`);

if (docs.length === 0) {
  console.log(`[${dataset}] No submission docs need cleanup. Done.`);
} else {
  console.log(`[${dataset}] Found ${docs.length} submission(s) needing cleanup.`);
}

for (const doc of docs) {
  const unsetPaths: string[] = [];
  if (doc.clientReferenceId !== undefined) unsetPaths.push("clientReferenceId");
  if (doc.abandonmentRecoveryFiredAt !== undefined) {
    unsetPaths.push("abandonmentRecoveryFiredAt");
  }

  const needsKeyBackfill = (doc.emailsFired ?? []).some((entry) => !entry._key);
  const keyedEntries = needsKeyBackfill
    ? (doc.emailsFired ?? []).map((entry) => ({
        ...entry,
        _key: entry._key ?? sanityKeyForEmailFired(entry),
      }))
    : null;

  let patch = client.patch(doc._id);
  if (unsetPaths.length > 0) patch = patch.unset(unsetPaths);
  if (keyedEntries) patch = patch.set({ emailsFired: keyedEntries });

  await patch.commit();
  console.log(
    `[${dataset}] ${doc._id} — unset [${unsetPaths.join(", ") || "(none)"}]` +
      (keyedEntries ? `, backfilled _key on ${keyedEntries.length} emailsFired entries` : ""),
  );
}

console.log(`[${dataset}] Cleanup complete.`);
