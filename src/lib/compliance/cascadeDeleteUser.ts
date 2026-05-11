import "server-only";

/**
 * GDPR Art. 17 cascade delete — keyed by user, not submission.
 *
 * Iter-3 design (locked 2026-05-11 in Phase 4 PRD `## Decisions`):
 *  - Predicate is `recipient_user_id = userId` (Phase 5-ready: when gifting
 *    introduces `purchaser_user_id`, Alice's deletion removes her purchase
 *    record but Bob's recipient_user_id-owned submission survives).
 *  - Vendor surfaces (Stripe Redaction Jobs, Brevo, Mixpanel data-deletions)
 *    are async with tracking IDs. We submit + store the IDs in
 *    `deletion_log`; a reconciliation cron (out of Phase 4 scope) polls
 *    vendor status and confirms completion.
 *  - Each step is wrapped in try/catch — partial failures accumulate into
 *    `partialFailures: string[]` and the cascade continues. The customer's
 *    "active systems" are scrubbed even if a single vendor call fails;
 *    the partial-failure list is what Becky chases.
 *
 * Order (correctness-critical):
 *  Per submission:
 *    1. R2 photo
 *    2. Sanity submission DOC   (must precede assets — Sanity rejects
 *    3. Sanity assets             asset delete while still referenced)
 *    4. D1 submissions row       (financial_records PRESERVED — 6yr HMRC)
 *  User-level (after all submissions):
 *    5. Stripe Redaction Job (customer_ids resolved from Stripe sessions)
 *    6. Brevo contact delete
 *    7. Brevo SMTP-log delete
 *    8. Mixpanel data-deletions (distinct_ids = submission ids)
 *    9. D1 listen_session + listen_magic_link + user row
 */
import { findUserById, normalizeEmail } from "../auth/users";
import { dbExec, dbQuery } from "../booking/persistence/sqlClient";
import {
  deleteSubmissionAndPhoto,
  listSubmissionsByRecipientUserId,
  type SubmissionRecord,
} from "../booking/submissions";
import { sha256Hex } from "../hmac";
import { getSanityWriteClient } from "../sanity/client";
import { retrieveCheckoutSession } from "../stripe";
import { deleteBrevoContact, deleteBrevoSmtpLog } from "./vendors/brevoDelete";
import { createMixpanelDataDeletion } from "./vendors/mixpanelDelete";
import { createStripeRedactionJob } from "./vendors/stripeRedaction";

export type DeletionResult = {
  userId: string;
  submissionIds: string[];
  startedAt: number;
  completedAt: number;
  stripeRedactionJobId: string | null;
  brevoSmtpProcessId: string | null;
  mixpanelTaskId: string | null;
  partialFailures: string[];
  success: boolean;
};

async function deleteSanityAssetsForSubmission(
  submissionId: string,
  partialFailures: string[],
): Promise<void> {
  let client;
  try {
    client = getSanityWriteClient();
  } catch {
    partialFailures.push(`sanity-client: not configured for ${submissionId}`);
    return;
  }

  type SubmissionAssetShape = {
    voiceNote?: { asset?: { _ref?: string } };
    readingPdf?: { asset?: { _ref?: string } };
  };

  let doc: SubmissionAssetShape | null = null;
  try {
    doc = await client.fetch<SubmissionAssetShape | null>(
      `*[_id == $id][0]{ voiceNote, readingPdf }`,
      { id: submissionId },
    );
  } catch (error) {
    partialFailures.push(
      `sanity-fetch: ${submissionId} — ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  // Delete the document FIRST — Sanity rejects asset deletion while still
  // referenced. Then delete each asset by its `_ref` id.
  try {
    await client.delete(submissionId);
  } catch (error) {
    partialFailures.push(
      `sanity-doc-delete: ${submissionId} — ${error instanceof Error ? error.message : String(error)}`,
    );
    // Don't return — still try the asset deletes; if doc-delete failed
    // because the doc is already gone, asset-delete will succeed cleanly.
  }

  const assetRefs = [doc?.voiceNote?.asset?._ref, doc?.readingPdf?.asset?._ref].filter(
    (ref): ref is string => Boolean(ref),
  );
  for (const ref of assetRefs) {
    try {
      await client.delete(ref);
    } catch (error) {
      partialFailures.push(
        `sanity-asset-delete: ${ref} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function resolveStripeCustomerId(
  stripeSessionId: string | undefined,
  partialFailures: string[],
): Promise<string | null> {
  if (!stripeSessionId) return null;
  try {
    const session = await retrieveCheckoutSession(stripeSessionId);
    const customer = session.customer;
    if (typeof customer === "string") return customer;
    if (customer && typeof customer === "object" && "id" in customer) return customer.id;
    return null;
  } catch (error) {
    partialFailures.push(
      `stripe-session-lookup: ${stripeSessionId} — ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function writeDeletionLog(
  args: {
    id: string;
    userId: string;
    emailHash: string;
    performedBy: string;
    action: "started" | "completed" | "failed";
    startedAt: number;
    completedAt: number | null;
    submissionIds: string[];
    partialFailures: string[];
    stripeRedactionJobId: string | null;
    brevoSmtpProcessId: string | null;
    mixpanelTaskId: string | null;
    ipHash: string | null;
  },
): Promise<void> {
  // started_at carries the cascade-start timestamp on BOTH rows so the
  // schema's NOT NULL holds and queries can group "this cascade" via a
  // (user_id, started_at) tuple. completed_at is the durable signal that
  // the cascade walked all the way through.
  await dbExec(
    `INSERT INTO deletion_log (
       id, user_id, email_hash, performed_by, action,
       started_at, completed_at,
       submission_ids_json, partial_failures_json,
       stripe_redaction_job_id, brevo_smtp_process_id, mixpanel_task_id,
       ip_hash
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      args.id,
      args.userId,
      args.emailHash,
      args.performedBy,
      args.action,
      args.startedAt,
      args.completedAt,
      JSON.stringify(args.submissionIds),
      JSON.stringify(args.partialFailures),
      args.stripeRedactionJobId,
      args.brevoSmtpProcessId,
      args.mixpanelTaskId,
      args.ipHash,
    ],
  );
}

export type CascadeDeleteUserOptions = {
  performedBy: string;
  ipHash?: string | null;
  /** Test seam — defaults to Date.now(). */
  now?: number;
};

export async function cascadeDeleteUser(
  userId: string,
  options: CascadeDeleteUserOptions,
): Promise<DeletionResult> {
  const startedAt = options.now ?? Date.now();
  const partialFailures: string[] = [];

  const user = await findUserById(userId);
  if (!user) {
    return {
      userId,
      submissionIds: [],
      startedAt,
      completedAt: startedAt,
      stripeRedactionJobId: null,
      brevoSmtpProcessId: null,
      mixpanelTaskId: null,
      partialFailures: ["user: not found (already deleted or never existed)"],
      success: true,
    };
  }
  const email = normalizeEmail(user.email);
  const emailHash = await sha256Hex(email);

  const submissions: SubmissionRecord[] = await listSubmissionsByRecipientUserId(userId);
  const submissionIds = submissions.map((s) => s._id);

  await writeDeletionLog({
    id: crypto.randomUUID(),
    userId,
    emailHash,
    performedBy: options.performedBy,
    action: "started",
    startedAt,
    completedAt: null,
    submissionIds,
    partialFailures: [],
    stripeRedactionJobId: null,
    brevoSmtpProcessId: null,
    mixpanelTaskId: null,
    ipHash: options.ipHash ?? null,
  });

  // Resolve Stripe customer_ids in parallel (independent reads, ≤ 1-3 sessions
  // per user at this scale — no rate-limit risk).
  const customerIdResults = await Promise.all(
    submissions.map((s) => resolveStripeCustomerId(s.stripeSessionId, partialFailures)),
  );
  const customerIds = Array.from(
    new Set(customerIdResults.filter((id): id is string => Boolean(id))),
  );
  const checkoutSessionIds = submissions
    .map((s) => s.stripeSessionId)
    .filter((id): id is string => Boolean(id));

  // Per-submission cleanup. Sequential within a submission (R2 → Sanity doc
  // → Sanity assets → D1) but submissions themselves could parallelize.
  // Keep sequential for now — gives deterministic partial-failure ordering
  // and avoids spiking Sanity API rate limits on bulk delete.
  for (const submission of submissions) {
    // Step 1+4: R2 photo + D1 row (existing helper deletes both).
    try {
      await deleteSubmissionAndPhoto({
        _id: submission._id,
        photoR2Key: submission.photoR2Key,
      });
    } catch (error) {
      partialFailures.push(
        `d1+r2-delete: ${submission._id} — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    // Steps 2+3: Sanity doc → Sanity assets.
    await deleteSanityAssetsForSubmission(submission._id, partialFailures);
  }

  // User-level vendor cascades — parallel. Each helper captures its own
  // VendorResult; partialFailures are pushed in deterministic order after
  // resolve so the audit log lists failures stripe → brevo-contact →
  // brevo-smtp → mixpanel regardless of which API returns first.
  const [stripeResult, brevoContactResult, brevoSmtpResult, mixpanelResult] = await Promise.all([
    createStripeRedactionJob({ customerIds, checkoutSessionIds }),
    deleteBrevoContact(email),
    deleteBrevoSmtpLog(email),
    createMixpanelDataDeletion(submissionIds),
  ]);
  const stripeRedactionJobId = stripeResult.ok ? stripeResult.trackingId : null;
  const brevoSmtpProcessId = brevoSmtpResult.ok ? brevoSmtpResult.trackingId : null;
  const mixpanelTaskId = mixpanelResult.ok ? mixpanelResult.trackingId : null;
  if (!stripeResult.ok) partialFailures.push(stripeResult.error);
  if (!brevoContactResult.ok) partialFailures.push(brevoContactResult.error);
  if (!brevoSmtpResult.ok) partialFailures.push(brevoSmtpResult.error);
  if (!mixpanelResult.ok) partialFailures.push(mixpanelResult.error);

  // User-level D1 rows last. Order: dependent rows (sessions, magic links)
  // before the parent (user). Idempotent on missing rows.
  try {
    await dbExec(`DELETE FROM listen_session WHERE user_id = ?`, [userId]);
    await dbExec(`DELETE FROM listen_magic_link WHERE user_id = ?`, [userId]);
    await dbExec(`DELETE FROM user WHERE id = ?`, [userId]);
  } catch (error) {
    partialFailures.push(
      `d1-user-rows: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const completedAt = options.now ?? Date.now();

  await writeDeletionLog({
    id: crypto.randomUUID(),
    userId,
    emailHash,
    performedBy: options.performedBy,
    action: "completed",
    startedAt,
    completedAt,
    submissionIds,
    partialFailures,
    stripeRedactionJobId,
    brevoSmtpProcessId,
    mixpanelTaskId,
    ipHash: options.ipHash ?? null,
  });

  return {
    userId,
    submissionIds,
    startedAt,
    completedAt,
    stripeRedactionJobId,
    brevoSmtpProcessId,
    mixpanelTaskId,
    partialFailures,
    success: true,
  };
}

/**
 * Query the deletion_log to check if a user was already cascade-deleted.
 * Used by Stripe webhook + reconcile cron to avoid orphan financial_records
 * writes post-deletion (PRD `## Risks` #10).
 */
export async function wasUserDeleted(userId: string): Promise<boolean> {
  const rows = await dbQuery<{ id: string }>(
    `SELECT id FROM deletion_log WHERE user_id = ? AND action = 'completed' LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
}
