import { deleteObject } from "../r2";
import type { SubmissionContext, SubmissionResponse } from "../resend";
import { getSanityWriteClient } from "../sanity/client";

const PHOTO_BASE_URL = "https://images.withjosephine.com";
const LIST_QUERY_LIMIT = 500;

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

const SUBMISSION_PROJECTION = `{
  _id,
  status,
  email,
  responses,
  photoR2Key,
  stripeEventId,
  stripeSessionId,
  clientReferenceId,
  createdAt,
  paidAt,
  expiredAt,
  deliveredAt,
  voiceNoteUrl,
  pdfUrl,
  emailsFired,
  "reading": serviceRef->{ name, priceDisplay }
}`;

export async function findSubmissionById(id: string): Promise<SubmissionRecord | null> {
  const result = await getSanityWriteClient().fetch<SubmissionRecord | null>(
    `*[_type == "submission" && _id == $id][0]${SUBMISSION_PROJECTION}`,
    { id },
  );
  return result ?? null;
}

export async function markSubmissionPaid(
  submissionId: string,
  paid: { stripeEventId: string; stripeSessionId: string; paidAt: string },
): Promise<void> {
  await getSanityWriteClient()
    .patch(submissionId)
    .set({
      status: "paid",
      paidAt: paid.paidAt,
      stripeEventId: paid.stripeEventId,
      stripeSessionId: paid.stripeSessionId,
    })
    .commit({ visibility: "sync" });
}

export async function markSubmissionExpired(
  submissionId: string,
  expired: { stripeEventId?: string; expiredAt: string },
): Promise<void> {
  await getSanityWriteClient()
    .patch(submissionId)
    .set({
      status: "expired",
      expiredAt: expired.expiredAt,
      ...(expired.stripeEventId ? { stripeEventId: expired.stripeEventId } : {}),
    })
    .commit({ visibility: "sync" });
}

export async function listSubmissionsByStatusOlderThan(
  status: SubmissionStatus,
  cutoffIso: string,
): Promise<SubmissionRecord[]> {
  return getSanityWriteClient().fetch<SubmissionRecord[]>(
    `*[_type == "submission" && status == $status && createdAt < $cutoff] | order(createdAt asc) [0...${LIST_QUERY_LIMIT}]${SUBMISSION_PROJECTION}`,
    { status, cutoff: cutoffIso },
  );
}

export async function listPaidSubmissionsForEmail(
  emailType: EmailFiredType,
  options: {
    paidBefore?: string;
    requireDeliveredAt?: boolean;
    requireMissingDeliveredAt?: boolean;
  },
): Promise<SubmissionRecord[]> {
  const filters = [
    `_type == "submission"`,
    `status == "paid"`,
    `count((emailsFired[].type)[@ == $emailType]) == 0`,
  ];
  if (options.paidBefore) filters.push(`paidAt < $paidBefore`);
  if (options.requireDeliveredAt) filters.push(`defined(deliveredAt)`);
  if (options.requireMissingDeliveredAt) filters.push(`!defined(deliveredAt)`);

  const params: Record<string, string> = { emailType };
  if (options.paidBefore) params.paidBefore = options.paidBefore;

  return getSanityWriteClient().fetch<SubmissionRecord[]>(
    `*[${filters.join(" && ")}] | order(paidAt asc) [0...${LIST_QUERY_LIMIT}]${SUBMISSION_PROJECTION}`,
    params,
  );
}

export async function appendEmailFired(
  submissionId: string,
  entry: EmailFiredEntry,
): Promise<void> {
  await getSanityWriteClient()
    .patch(submissionId)
    .setIfMissing({ emailsFired: [] })
    .insert("after", "emailsFired[-1]", [entry])
    .commit({ visibility: "sync" });
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
  await getSanityWriteClient().delete(submission._id);
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
  await getSanityWriteClient()
    .patch(submission._id)
    .unset(["photoR2Key"])
    .commit({ visibility: "sync" });
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
    photoUrl: submission.photoR2Key ? `${PHOTO_BASE_URL}/${submission.photoR2Key}` : null,
    createdAt: submission.createdAt,
  };
}
