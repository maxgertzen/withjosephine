// Stopgap for Phase 1: mark a submission delivered. The day-7 delivery
// cron only fires once `deliveredAt` is set. Until the admin UI lands
// (POST_LAUNCH_BACKLOG.md), use this from the dev box:
//
//   pnpm tsx scripts/mark-delivered.mts <submissionId> [voiceNoteUrl] [pdfUrl]
//
// Mirrors the change to Sanity in the same call. Reads BOOKING_DB_*
// from .env.local so this runs against the same DB the Worker uses.

import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const [submissionId, voiceNoteUrl, pdfUrl] = process.argv.slice(2);
if (!submissionId) {
  console.error("Usage: pnpm tsx scripts/mark-delivered.mts <submissionId> [voiceNoteUrl] [pdfUrl]");
  process.exit(1);
}

const { dbExec, dbQuery } = await import("../src/lib/booking/persistence/sqlClient");

const existing = await dbQuery<{ id: string; status: string; delivered_at: string | null }>(
  `SELECT id, status, delivered_at FROM submissions WHERE id = ? LIMIT 1`,
  [submissionId],
);
const row = existing[0];
if (!row) {
  console.error(`No submission with id "${submissionId}"`);
  process.exit(1);
}
if (row.status !== "paid") {
  console.error(`Submission ${submissionId} is "${row.status}", not "paid". Refusing.`);
  process.exit(1);
}

const deliveredAt = new Date().toISOString();
const sets: string[] = [`delivered_at = ?`];
const params: (string | null)[] = [deliveredAt];
if (voiceNoteUrl) {
  sets.push(`voice_note_url = ?`);
  params.push(voiceNoteUrl);
}
if (pdfUrl) {
  sets.push(`pdf_url = ?`);
  params.push(pdfUrl);
}
params.push(submissionId);

const result = await dbExec(
  `UPDATE submissions SET ${sets.join(", ")} WHERE id = ?`,
  params,
);

console.log(`Patched ${submissionId}: deliveredAt=${deliveredAt} (rows: ${result.rowsWritten})`);

// Sanity mirror
const { mirrorSubmissionPatch } = await import("../src/lib/booking/persistence/sanityMirror");
await mirrorSubmissionPatch(submissionId, {
  deliveredAt,
  ...(voiceNoteUrl ? { voiceNoteUrl } : {}),
  ...(pdfUrl ? { pdfUrl } : {}),
});
console.log("Sanity mirror requested.");
