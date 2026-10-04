import "server-only";

import { getOrCreateUser } from "../auth/users";
import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import { mintDataExportUrl } from "./dataExportUrl";
import {
  type EmailFailureFields,
  failureFromError,
  failureFromUnsentResult,
  recordEmailFailure,
} from "./emailFailures";
import {
  appendEmailFired,
  buildSubmissionContext,
  type FinancialMirror,
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

export type ApplyPaidResult = "applied" | "alreadyApplied";

export async function applyPaidEvent(
  submission: SubmissionRecord,
  details: PaidEventDetails,
): Promise<ApplyPaidResult> {
  if (submission.status === SUBMISSION_STATUS.paid) {
    if (submission.stripeSessionId !== details.stripeSessionId) {
      console.warn(
        `[notifyPaid] submission ${submission._id} already paid by session ${submission.stripeSessionId}, ignoring paid session ${details.stripeSessionId}`,
      );
    }
    return "alreadyApplied";
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

  // Tax-retention record (6yr HMRC) — separable from reading content (3yr)
  // so the cascade can scrub PII without breaching record-keeping.
  // Stripe always returns amount + currency on a paid checkout session;
  // the null-guard keeps the contract type-safe and skips the financial
  // row on the reconcile-cron path that synthesizes a stripeEventId.
  const financial: FinancialMirror | undefined =
    details.amountPaidCents != null && details.amountPaidCurrency != null
      ? {
          submissionId: submission._id,
          userId: recipientUserId,
          email: submission.email,
          paidAt: details.paidAt,
          amountPaidCents: details.amountPaidCents,
          amountPaidCurrency: details.amountPaidCurrency,
          country: details.country,
          stripeSessionId: details.stripeSessionId,
        }
      : undefined;

  await markSubmissionPaid(submission._id, { ...details, recipientUserId }, financial);

  const dataExportUrl = await mintDataExportUrl({
    submissionId: submission._id,
    recipientUserId,
    mintSource: "order_confirmation",
  });

  const dispatches: Array<Promise<unknown>> = [
    sendNotificationToJosephine(context, {
      idempotencyKey: `josephine-notification/${submission._id}`,
    }).catch((error) => {
      console.error(`[notifyPaid] Josephine email failed for ${submission._id}`, error);
    }),
  ];

  const attemptedAt = new Date().toISOString();
  const recordOrderConfirmationFailure = (
    failure: Omit<EmailFailureFields, "emailType" | "recipient">,
  ) =>
    recordEmailFailure(submission._id, {
      emailType: "order_confirmation",
      recipient: submission.email,
      attemptedAt,
      ...failure,
    });

  dispatches.push(
    sendOrderConfirmation(context, {
      dataExportUrl,
      idempotencyKey: `order-confirmation/${submission._id}`,
    })
      .then(async (result) => {
        if (result.kind === "dry_run") return;
        if (result.kind !== "sent") {
          await recordOrderConfirmationFailure(failureFromUnsentResult(result));
          return;
        }
        try {
          await appendEmailFired(submission._id, {
            type: "order_confirmation",
            sentAt: new Date().toISOString(),
            resendId: result.resendId,
          });
        } catch (error) {
          console.error(
            `[notifyPaid] emailsFired write failed for ${submission._id}`,
            error,
          );
        }
      })
      .catch(async (error) => {
        console.error(`[notifyPaid] Order confirmation failed for ${submission._id}`, error);
        await recordOrderConfirmationFailure(failureFromError(error));
      }),
  );

  await Promise.all(dispatches);

  return "applied";
}
