import type {
  EmailFiredEntry,
  EmailFiredType,
  SubmissionRecord,
  SubmissionStatus,
} from "@/lib/page-previews/types";
import { R2_PUBLIC_ORIGIN } from "@/lib/r2/publicOrigin";

import { computeFinancialRetainedUntil } from "../compliance/retention";
import { deleteObject } from "../r2";
import type { SubmissionContext, SubmissionResponse } from "../resend";
import { formatAmountPaid } from "./formatAmount";
import type {
  CreateSubmissionInput,
  FinancialRecordInput,
} from "./persistence/repository";
import * as repo from "./persistence/repository";
import { runMirror } from "./persistence/runMirror";
import {
  mirrorAppendEmailFired,
  mirrorMarkSubmissionListened,
  mirrorSubmissionCreate,
  mirrorSubmissionDelete,
  mirrorSubmissionPatch,
  mirrorUnsetPhotoKey,
} from "./persistence/sanityMirror";
import { dbBatch } from "./persistence/sqlClient";
import { priceDisplayFor } from "./priceDisplayFor";

export const SUBMISSION_STATUS = {
  pending: "pending",
  paid: "paid",
  expired: "expired",
} as const;

export type { EmailFiredEntry, EmailFiredType, SubmissionRecord, SubmissionStatus };

/**
 * D1 (or local SQLite for dev/tests) is the sole source of truth for
 * submissions. Sanity holds a one-way mirror that Studio can browse;
 * mirror writes are fire-and-forget and never block the user.
 * See ADR-001 for context.
 */

export type CreateSubmissionParams = CreateSubmissionInput & {
  consentAcknowledgedAt: string;
  ipAddress: string | null;
  // Nullable for legacy callers and tests; the booking POST path populates all three.
  art6AcknowledgedAt?: string | null;
  art9AcknowledgedAt?: string | null;
  coolingOffAcknowledgedAt?: string | null;
};

export async function createSubmission(params: CreateSubmissionParams): Promise<void> {
  const {
    consentAcknowledgedAt,
    ipAddress,
    art6AcknowledgedAt,
    art9AcknowledgedAt,
    coolingOffAcknowledgedAt,
    ...input
  } = params;
  await repo.createSubmission({
    ...input,
    coolingOffAcknowledgedAt: coolingOffAcknowledgedAt ?? null,
  });
  runMirror(
    mirrorSubmissionCreate(input, {
      consentAcknowledgedAt,
      ipAddress,
      art6AcknowledgedAt: art6AcknowledgedAt ?? null,
      art9AcknowledgedAt: art9AcknowledgedAt ?? null,
      coolingOffAcknowledgedAt: coolingOffAcknowledgedAt ?? null,
    }),
  );
}

export async function findSubmissionById(id: string): Promise<SubmissionRecord | null> {
  return repo.findSubmissionById(id);
}

export async function findSubmissionRecipientUserId(
  id: string,
): Promise<{ submissionId: string; recipientUserId: string | null } | null> {
  return repo.findSubmissionRecipientUserId(id);
}

export async function findSubmissionListenContext(
  id: string,
): Promise<{
  submissionId: string;
  recipientUserId: string | null;
  voiceNoteUrl: string | null;
  pdfUrl: string | null;
  readingSlug: string;
  readingName: string | null;
  firstName: string | null;
  lastName: string | null;
} | null> {
  return repo.findSubmissionListenContext(id);
}

export type FinancialMirror = Omit<FinancialRecordInput, "retainedUntil">;

export async function markSubmissionPaid(
  submissionId: string,
  paid: {
    stripeEventId: string;
    stripeSessionId: string;
    paidAt: string;
    amountPaidCents: number | null;
    amountPaidCurrency: string | null;
    recipientUserId?: string | null;
  },
  // When provided, the paid UPDATE and financial_records INSERT submit as a
  // single atomic D1 batch. retainedUntil is derived from paidAt so callers
  // can't diverge from the 6yr-retention policy.
  financial?: FinancialMirror,
): Promise<void> {
  if (financial) {
    await dbBatch([
      repo.buildMarkSubmissionPaidStatement(submissionId, paid),
      repo.buildInsertFinancialRecordStatement({
        ...financial,
        retainedUntil: computeFinancialRetainedUntil(financial.paidAt),
      }),
    ]);
  } else {
    await repo.markSubmissionPaid(submissionId, paid);
  }
  runMirror(
    mirrorSubmissionPatch(submissionId, {
      status: SUBMISSION_STATUS.paid,
      paidAt: paid.paidAt,
      stripeEventId: paid.stripeEventId,
      stripeSessionId: paid.stripeSessionId,
      amountPaidCents: paid.amountPaidCents,
      amountPaidCurrency: paid.amountPaidCurrency,
    }),
  );
}

export async function markSubmissionExpired(
  submissionId: string,
  expired: { stripeEventId?: string; expiredAt: string },
): Promise<void> {
  await repo.markSubmissionExpired(submissionId, expired);
  runMirror(
    mirrorSubmissionPatch(submissionId, {
      status: SUBMISSION_STATUS.expired,
      expiredAt: expired.expiredAt,
      ...(expired.stripeEventId ? { stripeEventId: expired.stripeEventId } : {}),
    }),
  );
}

export async function listAllReferencedPhotoKeys(): Promise<Set<string>> {
  return repo.listAllReferencedPhotoKeys();
}

export async function listSubmissionsByStatusOlderThan(
  status: SubmissionStatus,
  cutoffIso: string,
): Promise<SubmissionRecord[]> {
  return repo.listSubmissionsByStatusOlderThan(status, cutoffIso);
}

export async function listPaidSubmissionsForEmail(
  emailType: EmailFiredType,
  options: { paidBefore?: string },
): Promise<SubmissionRecord[]> {
  return repo.listPaidSubmissionsForEmail(emailType, options);
}

export async function listSubmissionsByRecipientUserId(
  userId: string,
): Promise<SubmissionRecord[]> {
  return repo.listSubmissionsByRecipientUserId(userId);
}

export async function findMostRecentPaidByRecipientUserId(
  userId: string,
): Promise<SubmissionRecord | null> {
  return repo.findMostRecentPaidByRecipientUserId(userId);
}

/**
 * First-listen signal. Fire-and-forget: caller schedules via runMirror so the
 * audio response never blocks on Sanity. Idempotent via Sanity's setIfMissing.
 */
export function scheduleListenedAtMirror(submissionId: string, listenedAt: string): void {
  runMirror(mirrorMarkSubmissionListened(submissionId, listenedAt));
}

export async function markSubmissionDelivered(
  submissionId: string,
  delivery: { deliveredAt: string; voiceNoteUrl: string; pdfUrl: string },
): Promise<void> {
  await repo.markSubmissionDelivered(submissionId, delivery);
}

export async function setSubmissionRecipientUser(
  submissionId: string,
  userId: string,
): Promise<void> {
  await repo.setSubmissionRecipientUser(submissionId, userId);
}

export async function appendEmailFired(
  submissionId: string,
  entry: EmailFiredEntry,
): Promise<void> {
  await repo.appendEmailFired(submissionId, entry);
  runMirror(mirrorAppendEmailFired(submissionId, entry));
}

export async function deleteSubmissionAndPhoto(
  submission: Pick<SubmissionRecord, "_id" | "photoR2Key">,
): Promise<{ photoDeleted: boolean }> {
  let photoDeleted = false;
  if (submission.photoR2Key) {
    try {
      await deleteObject(submission.photoR2Key);
      photoDeleted = true;
    } catch (error) {
      console.error(
        `[cleanup] Failed to delete R2 photo ${submission.photoR2Key}; deleting submission anyway`,
        error,
      );
    }
  }
  await repo.deleteSubmission(submission._id);
  runMirror(mirrorSubmissionDelete(submission._id));
  return { photoDeleted };
}

export async function scrubSubmissionPhoto(
  submission: Pick<SubmissionRecord, "_id" | "photoR2Key">,
): Promise<boolean> {
  if (!submission.photoR2Key) return false;
  try {
    await deleteObject(submission.photoR2Key);
  } catch (error) {
    console.error(`[cleanup] Failed to delete R2 photo ${submission.photoR2Key}`, error);
    return false;
  }
  await repo.unsetPhotoR2Key(submission._id);
  runMirror(mirrorUnsetPhotoKey(submission._id));
  return true;
}

export const FIRST_NAME_FALLBACK = "there";

export function extractFirstName(responses: SubmissionRecord["responses"]) {
  const entry = responses.find((response) => response.fieldKey === "first_name");
  const value = entry?.value?.trim();
  if (value) return value;
  const legacy = responses.find((response) => response.fieldKey === "legal_full_name");
  const legacyFirst = legacy?.value?.trim().split(/\s+/)[0];
  return legacyFirst || FIRST_NAME_FALLBACK;
}

export function buildSubmissionContext(submission: SubmissionRecord): SubmissionContext {
  const responses: SubmissionResponse[] = submission.responses.map((response) => ({
    fieldKey: response.fieldKey,
    fieldLabelSnapshot: response.fieldLabelSnapshot,
    fieldType: response.fieldType,
    value: response.value,
  }));

  return {
    id: submission._id,
    email: submission.email,
    firstName: extractFirstName(submission.responses),
    readingName: submission.reading?.name ?? "your reading",
    readingPriceDisplay: priceDisplayFor(submission),
    amountPaidDisplay: formatAmountPaid(submission.amountPaidCents, submission.amountPaidCurrency),
    responses,
    photoUrl: submission.photoR2Key ? `${R2_PUBLIC_ORIGIN}/${submission.photoR2Key}` : null,
    createdAt: submission.createdAt,
  };
}
