import "server-only";

import * as Sentry from "@sentry/cloudflare";
import type Stripe from "stripe";

import {
  activateGift,
  type ActivateGiftResult,
  giftActivationFromSession,
} from "@/lib/gift/activateGift";
import { paidFieldsFromSession, type PaidSessionFields } from "@/lib/stripeSession";

import { refundDuplicatePayment } from "./duplicatePayment";
import { applyPaidEvent, type ApplyPaidResult } from "./notifyPaid";
import { findSubmissionById, type SubmissionRecord } from "./submissions";

type AppliedSession =
  | { kind: "gift"; result: ActivateGiftResult }
  | {
      kind: "booking";
      submission: SubmissionRecord;
      result: ApplyPaidResult;
      paid: PaidSessionFields;
    }
  | { kind: "no_reference" }
  | { kind: "unpaid" }
  | { kind: "submission_not_found"; submissionId: string };

export type PaidSessionOutcome = AppliedSession & { refunded: boolean };

type PaidEventMeta = { stripeEventId: string; paidAt: string };

async function applySession(
  session: Stripe.Checkout.Session,
  { stripeEventId, paidAt }: PaidEventMeta,
): Promise<AppliedSession> {
  const giftActivation = giftActivationFromSession(session, paidAt);
  if (giftActivation) {
    const { result } = await activateGift(giftActivation);
    return { kind: "gift", result };
  }

  const submissionId = session.client_reference_id;
  if (!submissionId) return { kind: "no_reference" };
  if (session.payment_status === "unpaid") {
    Sentry.captureMessage("Completed Checkout session is unpaid, booking not marked paid", {
      level: "warning",
      extra: { submissionId, stripeSessionId: session.id },
    });
    return { kind: "unpaid" };
  }

  const submission = await findSubmissionById(submissionId);
  if (!submission) return { kind: "submission_not_found", submissionId };

  const paid = paidFieldsFromSession(session, paidAt);
  const result = await applyPaidEvent(submission, { stripeEventId, ...paid });
  return { kind: "booking", submission, result, paid };
}

function isDuplicate(applied: AppliedSession): boolean {
  return (applied.kind === "gift" || applied.kind === "booking") && applied.result === "duplicate";
}

export async function applyPaidSession(
  session: Stripe.Checkout.Session,
  meta: PaidEventMeta,
): Promise<PaidSessionOutcome> {
  const applied = await applySession(session, meta);
  const refunded = isDuplicate(applied) && (await refundDuplicatePayment(session));
  return { ...applied, refunded };
}
