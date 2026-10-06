import "server-only";

import {
  type GiftResendRequest,
  isResendLimitReached,
  type ResendOutcome,
  settleResend,
} from "@/lib/booking/resendRequest";
import { buildSubmissionContext, findSubmissionById } from "@/lib/booking/submissions";
import type { EmailSendResult } from "@/lib/resend";

import { sendBuyerConfirmation } from "./activateGift";
import { deriveVerifiedGiftCode } from "./giftCode";
import { recordGiftEmailFailure, recordUnsentGiftEmail } from "./giftEmailFailures";
import { sendBuyerGiftOpened } from "./giftOpenedEmail";
import { findGiftByDocId, recordGiftEmailResent } from "./gifts";
import { GIFT_STATUS, type GiftEmailFiredType, type GiftRecord, type GiftStatus } from "./types";

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

const BUYER_EMAIL: Record<
  BuyerEmailType,
  { status: GiftStatus; wrongStatusReason: GiftRefusedReason; keyPrefix: string }
> = {
  gift_confirmation: {
    status: GIFT_STATUS.active,
    wrongStatusReason: "gift_not_active",
    keyPrefix: "gift-confirmation",
  },
  gift_opened: {
    status: GIFT_STATUS.redeemed,
    wrongStatusReason: "gift_not_opened",
    keyPrefix: "gift-opened",
  },
};

async function sendGiftOpenedAgain(
  gift: GiftRecord,
  buyerEmail: string,
  idempotencyKey: string,
): Promise<EmailSendResult | GiftRefusedReason> {
  const submission = gift.redeemedSubmissionId
    ? await findSubmissionById(gift.redeemedSubmissionId)
    : null;
  if (!submission) return "gift_not_opened";
  return sendBuyerGiftOpened(gift, buildSubmissionContext(submission), buyerEmail, idempotencyKey);
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

export async function processGiftResendRequest(request: GiftResendRequest): Promise<ResendOutcome> {
  const gift = await findGiftByDocId(request.submissionId);
  if (!gift) return "notFound";
  const emailType = BUYER_EMAIL_FOR_REQUEST[request.emailType];
  const { status, wrongStatusReason, keyPrefix } = BUYER_EMAIL[emailType];
  const attemptedAt = new Date().toISOString();
  const refuse = async (errorCode: GiftRefusedReason): Promise<"refused"> => {
    await recordGiftEmailFailure(gift.id, { emailType, kind: "refused", errorCode });
    return "refused";
  };

  if (gift.status !== status) return refuse(wrongStatusReason);
  if (isResendLimitReached(gift.emailsFired, (type) => type === emailType, Date.now())) {
    return refuse("rate_limited");
  }
  const idempotencyKey = `${keyPrefix}/${gift.id}/resend/${Date.parse(request.requestedAt)}`;
  let result: EmailSendResult | GiftRefusedReason;
  try {
    result = await sendBuyerEmailAgain(gift, emailType, idempotencyKey);
  } catch (error) {
    await recordUnsentGiftEmail(gift.id, emailType, attemptedAt, error);
    return "failed";
  }
  if (typeof result === "string") return refuse(result);
  return settleResend(result, {
    recordFailure: (unsent) => recordUnsentGiftEmail(gift.id, emailType, attemptedAt, unsent),
    recordSent: (resendId) =>
      recordGiftEmailResent(
        gift.id,
        { type: emailType, sentAt: new Date().toISOString(), resendId },
        request.emailType,
      ),
  });
}
