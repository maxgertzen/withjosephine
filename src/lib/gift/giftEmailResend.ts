import "server-only";

import { failureFromError, failureFromUnsentResult } from "@/lib/booking/emailFailures";
import type { ResendOutcome } from "@/lib/booking/resendCustomerEmail";
import { isResendLimitReached } from "@/lib/booking/resendLimit";
import { buildSubmissionContext, findSubmissionById } from "@/lib/booking/submissions";
import { type EmailSendResult, sendGiftOpened } from "@/lib/resend";

import { sendBuyerConfirmation } from "./activateGift";
import { deriveVerifiedGiftCode } from "./giftCode";
import { type GiftEmailFailureFields, recordGiftEmailFailure } from "./giftEmailFailures";
import { findGiftById, recordGiftEmailResent } from "./gifts";
import { GIFT_STATUS, type GiftEmailFiredType, type GiftRecord, type GiftStatus } from "./types";

export type GiftResendRequest = {
  submissionId: string;
  emailType: GiftEmailFiredType;
  requestedAt: string;
};

type BuyerEmailType = "gift_confirmation" | "gift_opened";

type GiftRefusedReason =
  | "rate_limited"
  | "gift_not_active"
  | "gift_not_opened"
  | "missing_buyer_email"
  | "missing_gift_code";

const BUYER_EMAIL_FOR_REQUEST: Record<GiftEmailFiredType, BuyerEmailType> = {
  gift_confirmation: "gift_confirmation",
  gift_send: "gift_confirmation",
  gift_opened: "gift_opened",
};

const REQUIRED_STATUS: Record<BuyerEmailType, GiftStatus> = {
  gift_confirmation: GIFT_STATUS.active,
  gift_opened: GIFT_STATUS.redeemed,
};

const WRONG_STATUS_REASON: Record<BuyerEmailType, GiftRefusedReason> = {
  gift_confirmation: "gift_not_active",
  gift_opened: "gift_not_opened",
};

const RESEND_KEY_PREFIX: Record<BuyerEmailType, string> = {
  gift_confirmation: "gift-confirmation",
  gift_opened: "gift-opened",
};

async function findGiftForDoc(docId: string): Promise<GiftRecord | null> {
  const gift = await findGiftById(docId);
  if (gift) return gift;
  const giftCodeId = (await findSubmissionById(docId))?.giftCodeId;
  return giftCodeId ? findGiftById(giftCodeId) : null;
}

async function sendGiftOpenedAgain(
  gift: GiftRecord,
  buyerEmail: string,
  idempotencyKey: string,
): Promise<EmailSendResult | GiftRefusedReason> {
  const submission = gift.redeemedSubmissionId
    ? await findSubmissionById(gift.redeemedSubmissionId)
    : null;
  if (!submission) return "gift_not_opened";
  const context = buildSubmissionContext(submission);
  return sendGiftOpened(
    {
      to: buyerEmail,
      firstName: gift.buyerFirstName,
      recipientName: context.firstName,
      readingName: context.readingName,
    },
    { giftId: gift.id, idempotencyKey },
  );
}

async function sendBuyerEmailAgain(
  gift: GiftRecord,
  emailType: BuyerEmailType,
  idempotencyKey: string,
): Promise<EmailSendResult | GiftRefusedReason> {
  if (!gift.buyerEmail) return "missing_buyer_email";
  if (emailType === "gift_opened") {
    return sendGiftOpenedAgain(gift, gift.buyerEmail, idempotencyKey);
  }
  const code = await deriveVerifiedGiftCode(gift);
  if (!code) return "missing_gift_code";
  return sendBuyerConfirmation(gift, code, gift.buyerEmail, idempotencyKey);
}

function sentAtsOfType(gift: GiftRecord, emailType: BuyerEmailType): string[] {
  return gift.emailsFired.filter((entry) => entry.type === emailType).map((entry) => entry.sentAt);
}

export async function processGiftResendRequest(request: GiftResendRequest): Promise<ResendOutcome> {
  const gift = await findGiftForDoc(request.submissionId);
  if (!gift) return "notFound";
  const emailType = BUYER_EMAIL_FOR_REQUEST[request.emailType];
  const recordFailure = (fields: Omit<GiftEmailFailureFields, "emailType">) =>
    recordGiftEmailFailure(gift.id, { emailType, ...fields });
  const refuse = async (errorCode: GiftRefusedReason): Promise<"refused"> => {
    await recordFailure({ kind: "refused", errorCode });
    return "refused";
  };

  if (gift.status !== REQUIRED_STATUS[emailType]) return refuse(WRONG_STATUS_REASON[emailType]);
  if (isResendLimitReached(sentAtsOfType(gift, emailType), Date.now())) {
    return refuse("rate_limited");
  }
  try {
    const idempotencyKey = `${RESEND_KEY_PREFIX[emailType]}/${gift.id}/resend/${Date.parse(request.requestedAt)}`;
    const result = await sendBuyerEmailAgain(gift, emailType, idempotencyKey);
    if (typeof result === "string") return refuse(result);
    if (result.kind === "failed" && result.error === "concurrent_idempotent_requests") {
      return "retryLater";
    }
    if (result.kind === "failed" || result.kind === "skipped") {
      await recordFailure(failureFromUnsentResult(result));
      return "failed";
    }
    await recordGiftEmailResent(
      gift.id,
      {
        type: emailType,
        sentAt: new Date().toISOString(),
        resendId: result.kind === "sent" ? result.resendId : null,
      },
      request.emailType,
    );
    return result.kind === "sent" ? "sent" : "dryRun";
  } catch (error) {
    await recordFailure(failureFromError(error));
    return "failed";
  }
}
