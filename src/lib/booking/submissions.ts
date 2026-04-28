import { deleteObject } from "../r2";
import type { SubmissionContext, SubmissionResponse } from "../resend";
import { getSanityWriteClient } from "../sanity/client";

const PHOTO_BASE_URL = "https://images.withjosephine.com";
const LIST_QUERY_LIMIT = 500;

export type SubmissionStatus = "pending" | "paid" | "expired";

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

export function buildSubmissionContext(submission: SubmissionRecord): SubmissionContext {
  const responses: SubmissionResponse[] = submission.responses.map((response) => ({
    fieldLabelSnapshot: response.fieldLabelSnapshot,
    fieldType: response.fieldType,
    value: response.value,
  }));

  return {
    id: submission._id,
    email: submission.email,
    readingName: submission.reading?.name ?? "your reading",
    readingPriceDisplay: submission.reading?.priceDisplay ?? "",
    responses,
    photoUrl: submission.photoR2Key ? `${PHOTO_BASE_URL}/${submission.photoR2Key}` : null,
    createdAt: submission.createdAt,
  };
}
