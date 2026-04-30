import { deleteObject } from "../r2";
import type { SubmissionContext, SubmissionResponse } from "../resend";
import { PHOTO_PUBLIC_URL_BASE } from "./constants";
import type { CreateSubmissionInput } from "./persistence/repository";
import * as repo from "./persistence/repository";
import {
  mirrorAppendEmailFired,
  mirrorSubmissionCreate,
  mirrorSubmissionDelete,
  mirrorSubmissionPatch,
  mirrorUnsetPhotoKey,
} from "./persistence/sanityMirror";

export type SubmissionStatus = "pending" | "paid" | "expired";

export type EmailFiredType =
  | "order_confirmation"
  | "day2"
  | "day7"
  | "day7-overdue-alert"
  | "day14"
  | "abandonment";

export type EmailFiredEntry = {
  type: EmailFiredType;
  sentAt: string;
  resendId: string | null;
};

export type SubmissionRecord = {
  _id: string;
  status: SubmissionStatus;
  email: string;
  responses: Array<{
    fieldKey: string;
    fieldLabelSnapshot: string;
    fieldType: string;
    value: string;
  }>;
  photoR2Key?: string;
  stripeEventId?: string;
  stripeSessionId?: string;
  clientReferenceId?: string;
  createdAt: string;
  paidAt?: string;
  expiredAt?: string;
  deliveredAt?: string;
  voiceNoteUrl?: string;
  pdfUrl?: string;
  emailsFired?: EmailFiredEntry[];
  reading: {
    name: string;
    priceDisplay: string;
  } | null;
};

/**
 * D1 (or local SQLite for dev/tests) is the sole source of truth for
 * submissions. Sanity holds a one-way mirror that Studio can browse;
 * mirror writes are fire-and-forget and never block the user.
 * See ADR-001 for context.
 */

export type CreateSubmissionParams = CreateSubmissionInput & {
  consentAcknowledgedAt: string;
  ipAddress: string | null;
};

export async function createSubmission(params: CreateSubmissionParams): Promise<void> {
  const { consentAcknowledgedAt, ipAddress, ...input } = params;
  await repo.createSubmission(input);
  void mirrorSubmissionCreate(input, consentAcknowledgedAt, ipAddress);
}

export async function findSubmissionById(id: string): Promise<SubmissionRecord | null> {
  return repo.findSubmissionById(id);
}

export async function markSubmissionPaid(
  submissionId: string,
  paid: { stripeEventId: string; stripeSessionId: string; paidAt: string },
): Promise<void> {
  await repo.markSubmissionPaid(submissionId, paid);
  void mirrorSubmissionPatch(submissionId, {
    status: "paid",
    paidAt: paid.paidAt,
    stripeEventId: paid.stripeEventId,
    stripeSessionId: paid.stripeSessionId,
  });
}

export async function markSubmissionExpired(
  submissionId: string,
  expired: { stripeEventId?: string; expiredAt: string },
): Promise<void> {
  await repo.markSubmissionExpired(submissionId, expired);
  void mirrorSubmissionPatch(submissionId, {
    status: "expired",
    expiredAt: expired.expiredAt,
    ...(expired.stripeEventId ? { stripeEventId: expired.stripeEventId } : {}),
  });
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
  options: {
    paidBefore?: string;
    requireDeliveredAt?: boolean;
    requireMissingDeliveredAt?: boolean;
  },
): Promise<SubmissionRecord[]> {
  return repo.listPaidSubmissionsForEmail(emailType, options);
}

export async function appendEmailFired(
  submissionId: string,
  entry: EmailFiredEntry,
): Promise<void> {
  await repo.appendEmailFired(submissionId, entry);
  void mirrorAppendEmailFired(submissionId, entry);
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
  void mirrorSubmissionDelete(submission._id);
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
  void mirrorUnsetPhotoKey(submission._id);
  return true;
}

function extractFirstName(responses: SubmissionRecord["responses"]): string {
  const entry = responses.find((response) => response.fieldKey === "first_name");
  const value = entry?.value?.trim();
  if (value) return value;
  const legacy = responses.find((response) => response.fieldKey === "legal_full_name");
  const legacyFirst = legacy?.value?.trim().split(/\s+/)[0];
  return legacyFirst || "there";
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
    readingPriceDisplay: submission.reading?.priceDisplay ?? "",
    responses,
    photoUrl: submission.photoR2Key ? `${PHOTO_PUBLIC_URL_BASE}/${submission.photoR2Key}` : null,
    createdAt: submission.createdAt,
  };
}
