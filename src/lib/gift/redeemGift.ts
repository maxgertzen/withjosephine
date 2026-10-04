import "server-only";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { getOrCreateUser } from "@/lib/auth/users";
import { normalizeEmailForm } from "@/lib/booking/emailNormalize";
import { afterSubmissionPaid } from "@/lib/booking/notifyPaid";
import { runMirror } from "@/lib/booking/persistence/runMirror";
import { dbBatch } from "@/lib/booking/persistence/sqlClient";
import {
  buildCreateSubmissionStatement,
  buildSubmissionContext,
  type CreateSubmissionInput,
  type CreateSubmissionParams,
  extractFirstName,
  findGiftSubmissionInput,
  findSubmissionById,
  hasGiftSubmission,
  mirrorNewSubmission,
  recordFromCreateInput,
  SUBMISSION_STATUS,
} from "@/lib/booking/submissions";

import { auditGiftRedeemed, auditInvalidGiftLink } from "./giftAudit";
import { buildRedeemGiftStatement, findGiftByCode, findGiftById, resolveGiftState } from "./gifts";
import type { GiftRecord } from "./types";

type NewGiftSubmission = Omit<CreateSubmissionParams, "id" | "status">;

export type RedeemGiftSubmissionInput = {
  request: Request;
  code: string;
  submission: NewGiftSubmission;
};

export type RedeemGiftSubmissionResult =
  | { kind: "redeemed"; submissionId: string }
  | { kind: "not_found" }
  | { kind: "not_active" }
  | { kind: "other_reading"; readingSlug: string }
  | { kind: "already_redeemed" };

async function findRecipientUserId(email: string, firstName: string, giftId: string) {
  try {
    const { userId } = await getOrCreateUser({ email, name: firstName });
    return userId;
  } catch (error) {
    console.error(`[redeemGift] user-create failed for gift ${giftId}`, error);
    return null;
  }
}

async function completeGiftRedemption(
  submission: CreateSubmissionParams,
  gift: GiftRecord,
): Promise<void> {
  try {
    await mirrorNewSubmission(submission, { gift: { buyerFirstName: gift.buyerFirstName } });
    const [storedSubmission, storedGift] = await Promise.all([
      findSubmissionById(submission.id),
      findGiftById(gift.id),
    ]);
    await afterSubmissionPaid({
      submissionId: submission.id,
      context: buildSubmissionContext(recordFromCreateInput(submission)),
      recipientUserId: submission.recipientUserId ?? null,
      emailsFired: storedSubmission?.emailsFired,
      gift: {
        id: gift.id,
        buyerFirstName: gift.buyerFirstName,
        buyerEmail: gift.buyerEmail,
        emailsFired: storedGift?.emailsFired,
      },
    });
  } catch (error) {
    console.error(`[redeemGift] completion failed for ${submission.id}`, error);
  }
}

function isSameRedeemer(redeemed: CreateSubmissionInput, retry: NewGiftSubmission): boolean {
  return (
    normalizeEmailForm(redeemed.email) === normalizeEmailForm(retry.email) &&
    redeemed.readingSlug === retry.readingSlug
  );
}

async function resumeRedemption(
  gift: GiftRecord,
  retry: NewGiftSubmission,
): Promise<RedeemGiftSubmissionResult> {
  const redeemed = gift.redeemedSubmissionId
    ? await findGiftSubmissionInput(gift.redeemedSubmissionId, gift.id)
    : null;
  if (!redeemed || !isSameRedeemer(redeemed, retry)) return { kind: "already_redeemed" };

  const acknowledgedAt = redeemed.coolingOffAcknowledgedAt ?? redeemed.createdAt;
  runMirror(
    completeGiftRedemption(
      {
        ...redeemed,
        consentAcknowledgedAt: acknowledgedAt,
        art6AcknowledgedAt: acknowledgedAt,
        art9AcknowledgedAt: acknowledgedAt,
        coolingOffAcknowledgedAt: acknowledgedAt,
        ipAddress: retry.ipAddress,
      },
      gift,
    ),
  );
  return { kind: "redeemed", submissionId: redeemed.id };
}

export async function redeemGiftSubmission({
  request,
  code,
  submission: newSubmission,
}: RedeemGiftSubmissionInput): Promise<RedeemGiftSubmissionResult> {
  const gift = await findGiftByCode(code);
  const state = resolveGiftState(gift);
  if (!gift || state === "not_found") {
    await auditInvalidGiftLink(request, AUDIT_EVENT_TYPE.gift_code_invalid);
    return { kind: "not_found" };
  }
  if (state === "redeemed") return resumeRedemption(gift, newSubmission);
  if (state === "not_active") return { kind: "not_active" };
  if (gift.readingSlug !== newSubmission.readingSlug) {
    return { kind: "other_reading", readingSlug: gift.readingSlug };
  }

  const recipientUserId = await findRecipientUserId(
    newSubmission.email,
    extractFirstName(newSubmission.responses),
    gift.id,
  );
  const submissionId = crypto.randomUUID();
  const redeemedAt = newSubmission.createdAt;
  const submission: CreateSubmissionParams = {
    ...newSubmission,
    id: submissionId,
    status: SUBMISSION_STATUS.paid,
    paidAt: redeemedAt,
    recipientUserId,
    giftCodeId: gift.id,
  };
  await dbBatch([
    buildRedeemGiftStatement({
      giftId: gift.id,
      readingSlug: gift.readingSlug,
      submissionId,
      redeemedAt,
    }),
    buildCreateSubmissionStatement(submission),
  ]);
  if (!(await hasGiftSubmission(submissionId, gift.id))) return { kind: "already_redeemed" };

  runMirror(completeGiftRedemption(submission, gift));
  await auditGiftRedeemed(request, { submissionId, userId: recipientUserId }).catch((error) => {
    console.error(`[redeemGift] audit write failed for ${submissionId}`, error);
  });
  return { kind: "redeemed", submissionId };
}
