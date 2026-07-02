import "server-only";

import { strToU8, type Zippable,zipSync } from "fflate";
import { NextResponse } from "next/server";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { exportTokenRecipientMatches, verifyExportToken } from "@/lib/auth/exportToken";
import { writeAudit } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey, getRequestAuditContext } from "@/lib/auth/requestAudit";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import {
  extractFirstName,
  findSubmissionById,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { wasUserDeleted } from "@/lib/compliance/cascadeDeleteUser";
import {
  READING_CONTENT_RETENTION_YEARS,
  TAX_RETENTION_YEARS,
} from "@/lib/compliance/retention";
import { getSignedDownloadUrl, putObject } from "@/lib/r2";
import { R2_PUBLIC_ORIGIN } from "@/lib/r2/publicOrigin";
import { getClientIp } from "@/lib/request";
import { sendPrivacyExportEmail } from "@/lib/resend";
import { getSanityWriteClient } from "@/lib/sanity/client";
import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * GDPR Article 20 — per-order data portability export.
 *
 * Gated by a signed `export.v1` token (emailed in the order confirmation) that
 * binds the submissionId + recipient. The export is scoped to that single order,
 * and the signed download URL is emailed to the order's registered address (not
 * returned to the caller) so a leaked link can't exfiltrate data to a third
 * party. Turnstile + CF rate limit + a per-order D1 throttle guard the endpoint.
 * GET must never trigger a side-effect; the request comes from /privacy/export.
 */

const EXPORT_KEY_PREFIX = "exports";
const EXPORT_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
const MAX_BUNDLE_BYTES = 100 * 1024 * 1024;
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
  submissionId: string,
  withinMs: number,
  now: number,
): Promise<number | null> {
  const cutoff = now - withinMs;
  const rows = await dbQuery<{ timestamp: number }>(
    `SELECT timestamp FROM listen_audit
       WHERE submission_id = ? AND event_type = 'export_request' AND timestamp > ?
       ORDER BY timestamp DESC LIMIT 1`,
    [submissionId, cutoff],
  );
  return rows[0]?.timestamp ?? null;
}

async function fetchConsentSnapshot(id: string): Promise<unknown> {
  try {
    const client = await getSanityWriteClient();
    const docs = await client.fetch<Array<{ _id: string; consentSnapshot?: unknown }>>(
      `*[_id in $ids]{ _id, consentSnapshot }`,
      { ids: [id] },
    );
    return docs[0]?.consentSnapshot ?? null;
  } catch {
    return null;
  }
}

function buildReadme(): string {
  return [
    "Your Josephine data export",
    "===========================",
    "",
    "This archive contains the data we hold for this reading.",
    "",
    "You'll find:",
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
    const url = `${R2_PUBLIC_ORIGIN}/${submission.photoR2Key}`;
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

type ExportRequestBody = {
  token: unknown;
  turnstileToken: unknown;
};

export async function POST(request: Request): Promise<Response> {
  const audit = await getRequestAuditContext(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return REFUSE(400);
  }
  const { token, turnstileToken } = (body ?? {}) as ExportRequestBody;
  if (typeof token !== "string" || token.length === 0) return REFUSE(400);

  // Rate limit before the Turnstile network round-trip.
  const allowed = await checkRateLimit("LISTEN_AUTH_SEND_LIMITER", getClientIpKey(request));
  if (!allowed) return REFUSE(429);

  if (typeof turnstileToken !== "string" || turnstileToken.length === 0) return REFUSE(400);
  const ip = getClientIp(request);
  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip ?? undefined);
  if (!turnstileOk) return REFUSE(400);

  const now = Date.now();
  const verified = await verifyExportToken({ token, now });
  if (!verified.valid) {
    await writeAudit({
      userId: null,
      eventType: AUDIT_EVENT_TYPE.export_token_invalid,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return REFUSE(403);
  }

  // Scope everything to exactly the order the token was signed for.
  const submission = await findSubmissionById(verified.submissionId);
  if (!submission || submission.status !== "paid") {
    return REFUSE(404);
  }

  const recipientUserId = submission.recipientUserId;
  if (!recipientUserId) return REFUSE(403);

  const recipientOk = await exportTokenRecipientMatches(
    verified.recipientUserIdHash,
    recipientUserId,
  );
  if (!recipientOk) {
    await writeAudit({
      userId: recipientUserId,
      submissionId: submission._id,
      eventType: AUDIT_EVENT_TYPE.export_cross_user_denied,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return REFUSE(403);
  }

  // Cascade-deleted user has no data left to export.
  if (await wasUserDeleted(recipientUserId)) {
    return REFUSE(410);
  }

  const recent = await recentExportTimestamp(submission._id, EXPORT_THROTTLE_MS, now);
  if (recent !== null) {
    await writeAudit({
      userId: recipientUserId,
      submissionId: submission._id,
      eventType: AUDIT_EVENT_TYPE.export_throttled,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return NextResponse.json(
      { error: "Export already requested recently. Please check your email." },
      { status: 429 },
    );
  }

  const [consentSnapshot, assetResults] = await Promise.all([
    fetchConsentSnapshot(submission._id),
    Promise.all(collectAssetTasks(submission).map(fetchAsset)),
  ]);

  const bundle: Zippable = {};
  bundle["README.txt"] = strToU8(buildReadme());

  const folder = submission._id;
  bundle[`${folder}/intake.json`] = strToU8(
    JSON.stringify({ responses: submission.responses }, null, 2),
  );
  bundle[`${folder}/consent.json`] = strToU8(
    JSON.stringify(
      {
        consentSnapshot,
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

  const exportKey = `${EXPORT_KEY_PREFIX}/${submission._id}/${now}.zip`;
  try {
    await putObject(exportKey, zipped, "application/zip");
  } catch (error) {
    console.error("[export] R2 upload failed", error);
    return NextResponse.json({ error: "Failed to upload export bundle" }, { status: 500 });
  }

  const signedUrl = await getSignedDownloadUrl(exportKey, EXPORT_URL_EXPIRY_SECONDS);

  const firstName = extractFirstName(submission.responses);

  // Deliver the link to the order's registered address, never the requester's.
  await sendPrivacyExportEmail({
    to: submission.email,
    firstName,
    downloadUrl: signedUrl,
    expiryDays: 7,
  }).catch((error) => {
    console.error("[export] Resend send failed", error);
  });

  await writeAudit({
    userId: recipientUserId,
    submissionId: submission._id,
    eventType: AUDIT_EVENT_TYPE.export_request,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    success: true,
  });

  return NextResponse.json(
    { expiresInSeconds: EXPORT_URL_EXPIRY_SECONDS },
    { status: 202 },
  );
}
