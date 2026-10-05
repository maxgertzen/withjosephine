import "server-only";

import * as Sentry from "@sentry/cloudflare";

import { getOrCreateUser } from "../auth/users";
import { appendGiftEmailFired } from "../gift/gifts";
import type { GiftEmailFiredEntry } from "../gift/types";
import {
  sendCustomerConfirmation,
  sendGiftOpened,
  sendNotificationToJosephine,
  type SubmissionContext,
} from "../resend";
import { isPaidByAnotherSession } from "../stripeSession";
import { mintDataExportUrl } from "./dataExportUrl";
import {
  type EmailFailureFields,
  failureFromError,
  failureFromUnsentResult,
  recordEmailFailure,
} from "./emailFailures";
import { isEmailFiredOfType } from "./emailFiredType";
import { buildFinancialMirror } from "./financialMirror";
import {
  appendEmailFired,
  buildSubmissionContext,
  type EmailFiredEntry,
  markSubmissionPaid,
  SUBMISSION_STATUS,
  type SubmissionRecord,
} from "./submissions";

export type PaidEventDetails = {
  stripeEventId: string;
  stripeSessionId: string;
  paidAt: string;
  amountPaidCents: number | null;
  amountPaidCurrency: string | null;
  country: string | null;
};

export type ApplyPaidResult = "applied" | "alreadyApplied" | "duplicate" | "notApplied";

function reportSubmissionNotMarkedPaid(submissionId: string): void {
  console.warn(`[notifyPaid] submission ${submissionId} could not be marked paid, no refund`);
  Sentry.captureMessage("Paid Checkout session did not mark its submission paid", {
    level: "warning",
    extra: { submissionId },
  });
}

function reportPaymentForSubmissionPaidWithoutSession(
  submissionId: string,
  stripeSessionId: string,
): void {
  console.warn(
    `[notifyPaid] submission ${submissionId} was paid without a Stripe session and got a paid session, refund it by hand`,
  );
  Sentry.captureMessage("Paid Checkout session for a submission paid without a Stripe session", {
    level: "error",
    extra: { submissionId, stripeSessionId },
  });
}

export async function applyPaidEvent(
  submission: SubmissionRecord,
  details: PaidEventDetails,
): Promise<ApplyPaidResult> {
  if (submission.status === SUBMISSION_STATUS.paid) {
    if (!submission.stripeSessionId) {
      reportPaymentForSubmissionPaidWithoutSession(submission._id, details.stripeSessionId);
    }
    return isPaidByAnotherSession(submission.stripeSessionId, details.stripeSessionId)
      ? "duplicate"
      : "alreadyApplied";
  }

  const context = buildSubmissionContext({
    ...submission,
    status: SUBMISSION_STATUS.paid,
    paidAt: details.paidAt,
    stripeEventId: details.stripeEventId,
    stripeSessionId: details.stripeSessionId,
    amountPaidCents: details.amountPaidCents,
    amountPaidCurrency: details.amountPaidCurrency,
  });

  let recipientUserId: string | null = null;
  try {
    const { userId } = await getOrCreateUser({ email: submission.email, name: context.firstName });
    recipientUserId = userId;
  } catch (error) {
    console.error(`[notifyPaid] user-create failed for ${submission._id}`, error);
  }

  const financial = buildFinancialMirror(
    { submissionId: submission._id, userId: recipientUserId, email: submission.email },
    details,
  );

  const marked = await markSubmissionPaid(
    submission._id,
    { ...details, recipientUserId },
    financial,
  );
  if (marked === "paid_by_another_session") return "duplicate";
  if (marked === "not_marked") {
    reportSubmissionNotMarkedPaid(submission._id);
    return "notApplied";
  }

  await afterSubmissionPaid({ submissionId: submission._id, context, recipientUserId });

  return "applied";
}

export type PaidGift = {
  id: string;
  buyerFirstName: string;
  buyerEmail: string | null;
  emailsFired?: readonly GiftEmailFiredEntry[];
};

export type AfterSubmissionPaidInput = {
  submissionId: string;
  context: SubmissionContext;
  recipientUserId: string | null;
  gift?: PaidGift;
  emailsFired?: readonly EmailFiredEntry[];
};

async function confirmToCustomer({
  submissionId,
  context,
  recipientUserId,
  gift,
}: AfterSubmissionPaidInput): Promise<void> {
  const dataExportUrl = await mintDataExportUrl({
    submissionId,
    recipientUserId,
    mintSource: "order_confirmation",
  });
  const attemptedAt = new Date().toISOString();
  const recordConfirmationFailure = (
    failure: Omit<EmailFailureFields, "emailType" | "recipient">,
  ) =>
    recordEmailFailure(submissionId, {
      emailType: "order_confirmation",
      recipient: context.email,
      attemptedAt,
      ...failure,
    });

  try {
    const { firedType, result } = await sendCustomerConfirmation(context, {
      dataExportUrl,
      idempotencyKey: gift
        ? `gift-recipient-confirmation/${submissionId}`
        : `order-confirmation/${submissionId}`,
      giftBuyerFirstName: gift?.buyerFirstName,
    });
    if (result.kind === "dry_run") return;
    if (result.kind !== "sent") {
      await recordConfirmationFailure(failureFromUnsentResult(result));
      return;
    }
    try {
      await appendEmailFired(submissionId, {
        type: firedType,
        sentAt: new Date().toISOString(),
        resendId: result.resendId,
      });
    } catch (error) {
      console.error(`[notifyPaid] emailsFired write failed for ${submissionId}`, error);
    }
  } catch (error) {
    console.error(`[notifyPaid] customer confirmation failed for ${submissionId}`, error);
    await recordConfirmationFailure(failureFromError(error));
  }
}

async function tellBuyerGiftOpened(
  context: SubmissionContext,
  gift: PaidGift,
  buyerEmail: string,
): Promise<void> {
  try {
    const result = await sendGiftOpened(
      {
        to: buyerEmail,
        firstName: gift.buyerFirstName,
        recipientName: context.firstName,
        readingName: context.readingName,
      },
      { giftId: gift.id, idempotencyKey: `gift-opened/${gift.id}` },
    );
    if (result.kind !== "sent") return;
    await appendGiftEmailFired(gift.id, {
      type: "gift_opened",
      sentAt: new Date().toISOString(),
      resendId: result.resendId,
    });
  } catch (error) {
    console.error(`[notifyPaid] gift opened email failed for gift ${gift.id}`, error);
  }
}

export async function afterSubmissionPaid(input: AfterSubmissionPaidInput): Promise<void> {
  const { submissionId, context, gift, emailsFired = [] } = input;
  const confirmationAlreadySent = emailsFired.some((entry) =>
    isEmailFiredOfType(entry.type, "order_confirmation"),
  );
  const giftOpenedAlreadySent = gift?.emailsFired?.some((entry) => entry.type === "gift_opened");

  const dispatches: Array<Promise<unknown>> = [
    sendNotificationToJosephine(context, {
      idempotencyKey: `josephine-notification/${submissionId}`,
      ...(gift && { giftBuyerFirstName: gift.buyerFirstName }),
    }).catch((error) => {
      console.error(`[notifyPaid] Josephine email failed for ${submissionId}`, error);
    }),
  ];
  if (!confirmationAlreadySent) dispatches.push(confirmToCustomer(input));
  if (gift?.buyerEmail && !giftOpenedAlreadySent) {
    dispatches.push(tellBuyerGiftOpened(context, gift, gift.buyerEmail));
  }

  await Promise.all(dispatches);
}
