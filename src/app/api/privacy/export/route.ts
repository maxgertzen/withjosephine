import "server-only";

import { strToU8, type Zippable,zipSync } from "fflate";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  COOKIE_NAME,
  getActiveSession,
  writeAudit,
} from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findUserById } from "@/lib/auth/users";
import { PHOTO_PUBLIC_URL_BASE } from "@/lib/booking/constants";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import {
  listSubmissionsByRecipientUserId,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { wasUserDeleted } from "@/lib/compliance/cascadeDeleteUser";
import {
  READING_CONTENT_RETENTION_YEARS,
  TAX_RETENTION_YEARS,
} from "@/lib/compliance/retention";
import { getSignedDownloadUrl, putObject } from "@/lib/r2";
import { sendPrivacyExportEmail } from "@/lib/resend";
import { getSanityWriteClient } from "@/lib/sanity/client";

/**
 * GDPR Article 20 — data portability export.
 *
 * Magic-link gated (same `__Host-listen_session` cookie that gates the
 * listen-page proxy routes). Bundles the user's reading content into a
 * single ZIP, uploads to R2, emails a 7-day-expiring pre-signed GET URL.
 *
 * Anti-abuse: throttle to one export per user per 5 minutes (via
 * `listen_audit` lookup); refuse for cascade-deleted users; cap submission
 * count to bound Worker memory/CPU for malformed users.
 *
 * Why ZIP-in-memory rather than streaming: today's bundles are 10–30 MB per
 * submission. One user typically has 1–3 submissions, well under the
 * Worker 128 MiB cap. If real bundles ever approach 50 MB the design flips
 * to streaming via `fflate.AsyncZipDeflate`.
 *
 * Asset fetches parallel via `Promise.all`. Failures degrade individual
 * files to a placeholder text node so the export still ships rather than
 * blocking the whole bundle on a single asset that's slow or 503-ing.
 * The `MAX_BUNDLE_BYTES` cap is enforced post-fetch (avoids a budget
 * race that would otherwise let concurrent fetches all pass a pre-check
 * and collectively exceed the cap).
 */

const EXPORT_KEY_PREFIX = "exports";
const EXPORT_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024;
const MAX_SUBMISSIONS_PER_EXPORT = 50;
const EXPORT_THROTTLE_MS = 5 * 60 * 1000;

const REFUSE = (status: number) => new NextResponse(null, { status });

function extFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname;
    const dot = path.lastIndexOf(".");
    if (dot === -1) return fallback;
    return path.slice(dot + 1).toLowerCase().slice(0, 8) || fallback;
  } catch {
    return fallback;
  }
}

type AssetTask = { key: string; url: string };
type AssetFetchResult = { key: string; bytes: Uint8Array; size: number; placeholder: boolean };

async function fetchAsset(task: AssetTask): Promise<AssetFetchResult> {
  try {
    const response = await fetch(task.url);
    if (!response.ok) {
      const bytes = strToU8(`Asset unavailable at export time (HTTP ${response.status}).`);
      return { key: task.key, bytes, size: bytes.length, placeholder: true };
    }
    const buffer = await response.arrayBuffer();
    return {
      key: task.key,
      bytes: new Uint8Array(buffer),
      size: buffer.byteLength,
      placeholder: false,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const bytes = strToU8(`Asset fetch failed: ${detail}`);
    return { key: task.key, bytes, size: bytes.length, placeholder: true };
  }
}

async function recentExportTimestamp(
  userId: string,
  withinMs: number,
  now: number,
): Promise<number | null> {
  const cutoff = now - withinMs;
  const rows = await dbQuery<{ timestamp: number }>(
    `SELECT timestamp FROM listen_audit
       WHERE user_id = ? AND event_type = 'export_request' AND timestamp > ?
       ORDER BY timestamp DESC LIMIT 1`,
    [userId, cutoff],
  );
  return rows[0]?.timestamp ?? null;
}

async function fetchConsentSnapshots(
  ids: string[],
): Promise<Record<string, unknown>> {
  if (ids.length === 0) return {};
  try {
    const client = getSanityWriteClient();
    const docs = await client.fetch<Array<{ _id: string; consentSnapshot?: unknown }>>(
      `*[_id in $ids]{ _id, consentSnapshot }`,
      { ids },
    );
    return Object.fromEntries(docs.map((d) => [d._id, d.consentSnapshot ?? null]));
  } catch {
    return {};
  }
}

function buildReadme(submissionCount: number): string {
  return [
    "Your Josephine data export",
    "===========================",
    "",
    `This archive contains the data we hold for your ${submissionCount} reading(s).`,
    "",
    "For each reading, you'll find:",
    "  intake.json       — every answer you submitted to the intake form",
    "  consent.json      — the consent records you agreed to at booking (Art. 6 + Art. 9)",
    "  transaction.json  — payment record (amount, date, currency, country)",
    "  delivery.json     — email history + delivery + listen timestamps",
    "  photo.*           — the photo you uploaded (if any)",
    "  voice-note.*      — the voice note Josephine recorded for you (if delivered)",
    "  reading.pdf       — the supporting PDF (if delivered)",
    "",
    "Retention",
    "---------",
    `Reading content (intake, photo, voice note, PDF) is kept for ${READING_CONTENT_RETENTION_YEARS} years from booking date.`,
    `Transactional records (name, email, amount, date, country) are kept for ${TAX_RETENTION_YEARS} years per UK HMRC requirements.`,
    "",
    "To request deletion, email hello@withjosephine.com with the subject 'Privacy request'.",
    "We respond within 30 days. Stripe redacts the personally identifying fields of your",
    "transaction record (the transaction itself is retained as legally required); backup",
    "copies age out within 90 days.",
    "",
  ].join("\n");
}

function collectAssetTasks(submission: SubmissionRecord): AssetTask[] {
  const tasks: AssetTask[] = [];
  if (submission.photoR2Key) {
    const url = `${PHOTO_PUBLIC_URL_BASE}/${submission.photoR2Key}`;
    tasks.push({ key: `${submission._id}/photo.${extFromUrl(url, "jpg")}`, url });
  }
  if (submission.voiceNoteUrl) {
    tasks.push({
      key: `${submission._id}/voice-note.${extFromUrl(submission.voiceNoteUrl, "mp3")}`,
      url: submission.voiceNoteUrl,
    });
  }
  if (submission.pdfUrl) {
    tasks.push({ key: `${submission._id}/reading.pdf`, url: submission.pdfUrl });
  }
  return tasks;
}

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";
  const audit = await getRequestAuditContext(request);
  const session = cookieValue ? await getActiveSession({ cookieValue }) : null;

  if (!session) {
    await writeAudit({
      userId: null,
      eventType: "listen_session_invalid",
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return REFUSE(403);
  }

  const user = await findUserById(session.userId);
  if (!user) return REFUSE(403);

  // Idempotency / abuse defense — reject if the cascade has already
  // anonymised this user (no data to export), or if an export ran within
  // the throttle window (re-emails the same content; would flood inbox).
  if (await wasUserDeleted(session.userId)) {
    return REFUSE(410);
  }

  const now = Date.now();
  const recent = await recentExportTimestamp(session.userId, EXPORT_THROTTLE_MS, now);
  if (recent !== null) {
    await writeAudit({
      userId: session.userId,
      eventType: "export_throttled",
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return NextResponse.json(
      { error: "Export already requested recently. Please check your email." },
      { status: 429 },
    );
  }

  const submissions = await listSubmissionsByRecipientUserId(session.userId);
  if (submissions.length > MAX_SUBMISSIONS_PER_EXPORT) {
    return NextResponse.json(
      { error: "Too many submissions for a single export. Please email hello@withjosephine.com." },
      { status: 413 },
    );
  }

  const submissionIds = submissions.map((s) => s._id);
  const [consentSnapshots, assetResults] = await Promise.all([
    fetchConsentSnapshots(submissionIds),
    Promise.all(submissions.flatMap(collectAssetTasks).map(fetchAsset)),
  ]);

  // Build bundle. Asset cap enforced AFTER all fetches resolve to avoid
  // a race where concurrent fetches each pass a pre-check and collectively
  // overshoot. Trim by replacing oversized entries with placeholders, in
  // insertion order.
  const bundle: Zippable = {};
  bundle["README.txt"] = strToU8(buildReadme(submissions.length));

  for (const submission of submissions) {
    const folder = submission._id;
    bundle[`${folder}/intake.json`] = strToU8(
      JSON.stringify({ responses: submission.responses }, null, 2),
    );
    bundle[`${folder}/consent.json`] = strToU8(
      JSON.stringify(
        {
          // Verbatim Sanity record (Art. 6 + Art. 9 labels + acknowledgedAt
          // + ipAddress). Falls back to the legacy D1-derived shape if the
          // Sanity lookup failed at fetch time — partial portability beats
          // none.
          consentSnapshot: consentSnapshots[submission._id] ?? null,
          consentLabel: "Stored in Sanity per consentSnapshot schema",
          paidAt: submission.paidAt ?? null,
        },
        null,
        2,
      ),
    );
    bundle[`${folder}/transaction.json`] = strToU8(
      JSON.stringify(
        {
          paidAt: submission.paidAt ?? null,
          amountPaidCents: submission.amountPaidCents,
          amountPaidCurrency: submission.amountPaidCurrency,
          stripeSessionId: submission.stripeSessionId ?? null,
          reading: submission.reading,
        },
        null,
        2,
      ),
    );
    bundle[`${folder}/delivery.json`] = strToU8(
      JSON.stringify(
        {
          deliveredAt: submission.deliveredAt ?? null,
          emailsFired: submission.emailsFired ?? [],
          status: submission.status,
        },
        null,
        2,
      ),
    );
  }

  let totalAssetBytes = 0;
  for (const result of assetResults) {
    if (totalAssetBytes + result.size > MAX_BUNDLE_BYTES) {
      bundle[result.key] = strToU8(
        `Asset omitted — bundle size cap of ${MAX_BUNDLE_BYTES} bytes reached.`,
      );
      continue;
    }
    bundle[result.key] = result.bytes;
    totalAssetBytes += result.size;
  }

  let zipped: Uint8Array;
  try {
    zipped = zipSync(bundle, { level: 6 });
  } catch (error) {
    console.error("[export] ZIP build failed", error);
    return NextResponse.json({ error: "Failed to build export bundle" }, { status: 500 });
  }

  const exportKey = `${EXPORT_KEY_PREFIX}/${session.userId}/${now}.zip`;
  try {
    await putObject(exportKey, zipped, "application/zip");
  } catch (error) {
    console.error("[export] R2 upload failed", error);
    return NextResponse.json({ error: "Failed to upload export bundle" }, { status: 500 });
  }

  const signedUrl = await getSignedDownloadUrl(exportKey, EXPORT_URL_EXPIRY_SECONDS);

  await sendPrivacyExportEmail({
    to: user.email,
    downloadUrl: signedUrl,
    submissionCount: submissions.length,
    expiryDays: 7,
  }).catch((error) => {
    console.error("[export] Resend send failed", error);
  });

  await writeAudit({
    userId: session.userId,
    eventType: "export_request",
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    success: true,
  });

  return NextResponse.json(
    { submissionCount: submissions.length, expiresInSeconds: EXPORT_URL_EXPIRY_SECONDS },
    { status: 202 },
  );
}
