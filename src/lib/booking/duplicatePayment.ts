import "server-only";

import * as Sentry from "@sentry/cloudflare";
import type Stripe from "stripe";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { isFirstReport } from "@/lib/audit/reportOnce";
import { type AuditRow, hasAuditRow, writeAuditOnce } from "@/lib/auth/listenSession";
import { giftIdFromClientReferenceId } from "@/lib/gift/clientReference";
import { findGiftById } from "@/lib/gift/gifts";
import {
  type DuplicateRefundAttempt,
  duplicateRefundKey,
  type KeptPayment,
  refundDuplicateCheckoutSession,
  retrieveKeptPayment,
} from "@/lib/stripe";
import { isPaidByAnotherSession } from "@/lib/stripeSession";

import { findPaidStripeSessionId } from "./submissions";

const UNSUCCESSFUL_REFUND_STATUSES: ReadonlySet<string> = new Set([
  "failed",
  "canceled",
  "requires_action",
]);

const refundedAuditId = duplicateRefundKey;
const failedAuditId = (stripeSessionId: string) => `${duplicateRefundKey(stripeSessionId)}/failed`;

type DuplicateSession = { clientReferenceId: string; stripeSessionId: string };

type KeptPaymentUnsafe = { reason: string; keptSessionId: string | null };

function refundAuditRow({ clientReferenceId }: DuplicateSession, success: boolean): AuditRow {
  return {
    eventType: AUDIT_EVENT_TYPE.duplicate_payment_refunded,
    userId: null,
    submissionId: clientReferenceId,
    success,
  };
}

async function reportFailureOnce(duplicate: DuplicateSession, report: () => void): Promise<void> {
  const first = await isFirstReport(
    failedAuditId(duplicate.stripeSessionId),
    refundAuditRow(duplicate, false),
  );
  if (first) report();
}

async function findKeptSessionId(clientReferenceId: string): Promise<string | null> {
  const giftId = giftIdFromClientReferenceId(clientReferenceId);
  if (giftId) return (await findGiftById(giftId))?.stripeSessionId ?? null;
  return findPaidStripeSessionId(clientReferenceId);
}

function keptPaymentProblem(kept: KeptPayment, clientReferenceId: string): string | null {
  if (kept.clientReferenceId !== clientReferenceId) return "for another reference";
  if (kept.paymentStatus !== "paid") return "not paid";
  if (kept.charge?.status !== "succeeded") return "without a succeeded charge";
  if (kept.charge.refunded || kept.charge.amount_refunded > 0) return "refunded";
  if (kept.charge.disputed) return "disputed";
  return null;
}

async function checkKeptPayment(duplicate: DuplicateSession): Promise<KeptPaymentUnsafe | null> {
  const keptSessionId = await findKeptSessionId(duplicate.clientReferenceId);
  if (!keptSessionId || !isPaidByAnotherSession(keptSessionId, duplicate.stripeSessionId)) {
    return { reason: "not on record", keptSessionId };
  }
  const problem = keptPaymentProblem(
    await retrieveKeptPayment(keptSessionId),
    duplicate.clientReferenceId,
  );
  return problem ? { reason: problem, keptSessionId } : null;
}

async function recordRefund(duplicate: DuplicateSession, refund: Stripe.Refund): Promise<boolean> {
  const refundExtra = { ...duplicate, refundId: refund.id, amountCents: refund.amount };
  try {
    const first = await writeAuditOnce(
      refundedAuditId(duplicate.stripeSessionId),
      refundAuditRow(duplicate, true),
    );
    if (!first) return false;
  } catch (error) {
    Sentry.captureException(error, { extra: { ...refundExtra, refundStatus: refund.status } });
    console.error(
      `[duplicatePayment] refund made for ${duplicate.clientReferenceId} but its audit write failed`,
    );
    return true;
  }

  const pending = refund.status === "pending";
  console.warn(
    `[duplicatePayment] ${duplicate.clientReferenceId} paid twice, refund of the second payment ${pending ? "is pending" : "succeeded"}`,
  );
  Sentry.captureMessage(
    pending
      ? "Duplicate Checkout payment refund is pending, confirm it in Stripe the next day"
      : "Duplicate Checkout payment refunded",
    { level: "warning", extra: refundExtra },
  );
  return true;
}

async function recordAlreadyRefunded(duplicate: DuplicateSession): Promise<void> {
  const first = await isFirstReport(
    refundedAuditId(duplicate.stripeSessionId),
    refundAuditRow(duplicate, true),
  );
  if (!first) return;
  console.warn(
    `[duplicatePayment] ${duplicate.clientReferenceId} second payment was already refunded in Stripe`,
  );
  Sentry.captureMessage("Duplicate Checkout payment was already refunded in Stripe", {
    level: "warning",
    extra: duplicate,
  });
}

function reportFailure(duplicate: DuplicateSession, error: unknown): Promise<void> {
  return reportFailureOnce(duplicate, () => {
    Sentry.captureException(error, { extra: duplicate });
    console.error(
      `[duplicatePayment] refund failed for ${duplicate.clientReferenceId}, see DUPLICATE_PAYMENT runbook`,
    );
  });
}

function reportKeptPaymentUnsafe(
  duplicate: DuplicateSession,
  { reason, keptSessionId }: KeptPaymentUnsafe,
): Promise<void> {
  return reportFailureOnce(duplicate, () => {
    Sentry.captureMessage(`Duplicate Checkout payment not refunded, the kept payment is ${reason}`, {
      level: "error",
      extra: { ...duplicate, keptSessionId },
    });
    console.error(
      `[duplicatePayment] ${duplicate.clientReferenceId} not refunded, the kept payment is ${reason}, see DUPLICATE_PAYMENT runbook`,
    );
  });
}

function reportNoPaymentIntent(duplicate: DuplicateSession): Promise<void> {
  return reportFailureOnce(duplicate, () => {
    Sentry.captureMessage("Duplicate Checkout session has no payment intent, no refund", {
      level: "warning",
      extra: duplicate,
    });
  });
}

export async function refundDuplicatePayment(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.payment_status !== "paid") return false;
  const duplicate = {
    clientReferenceId: session.client_reference_id ?? "",
    stripeSessionId: session.id,
  };
  if (await hasAuditRow(refundedAuditId(session.id))) return false;

  let attempt: DuplicateRefundAttempt;
  try {
    const unsafe = await checkKeptPayment(duplicate);
    if (unsafe) {
      await reportKeptPaymentUnsafe(duplicate, unsafe);
      return false;
    }
    attempt = await refundDuplicateCheckoutSession(session, {
      client_reference_id: duplicate.clientReferenceId,
    });
  } catch (error) {
    await reportFailure(duplicate, error);
    return false;
  }

  switch (attempt.kind) {
    case "no_payment_intent":
      await reportNoPaymentIntent(duplicate);
      return false;
    case "already_refunded":
      await recordAlreadyRefunded(duplicate);
      return false;
    case "nothing_to_refund":
    case "in_flight":
      return false;
    case "refund":
      break;
  }

  const { refund } = attempt;
  if (refund.status && UNSUCCESSFUL_REFUND_STATUSES.has(refund.status)) {
    await reportFailure(duplicate, new Error(`Duplicate refund ${refund.id} is ${refund.status}`));
    return false;
  }
  return recordRefund(duplicate, refund);
}
