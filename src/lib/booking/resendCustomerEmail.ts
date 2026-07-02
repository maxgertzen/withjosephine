import { LISTEN_TOKEN_TTL_MS, mintListenToken } from "@/lib/auth/listenToken";
import { siteOrigin } from "@/lib/env";

import {
  redactEmail,
  resolveDeliveryAddress,
  sendDay7Delivery,
  sendOrderConfirmation,
} from "../resend";
import { READING_ACCESS_TTL_MS } from "./readingRetention";
import {
  appendEmailFired,
  buildSubmissionContext,
  type EmailFiredType,
  findSubmissionById,
  type SubmissionRecord,
} from "./submissions";

export type ResendableEmailType = "order_confirmation" | "day7";

export const RESENDABLE_EMAIL_TYPES: readonly ResendableEmailType[] = [
  "order_confirmation",
  "day7",
];

export type ResendRefusalReason =
  | "not_found"
  | "not_paid"
  | "rate_limited"
  | "send_failed";

export type ResendOutcome =
  | { ok: true; emailType: ResendableEmailType; targetEmailRedacted: string }
  | { ok: false; reason: ResendRefusalReason };

const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESEND_MAX_PER_WINDOW = 3;

function countRecentResends(
  submission: SubmissionRecord,
  emailType: EmailFiredType,
  nowMs: number,
): number {
  return (submission.emailsFired ?? []).filter((entry) => {
    if (entry.type !== emailType) return false;
    const sentAtMs = Date.parse(entry.sentAt);
    if (Number.isNaN(sentAtMs)) return false;
    return nowMs - sentAtMs < RESEND_WINDOW_MS;
  }).length;
}

export async function resendCustomerEmail(
  submissionId: string,
  emailType: ResendableEmailType,
): Promise<ResendOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return { ok: false, reason: "not_found" };
  if (submission.status !== "paid") return { ok: false, reason: "not_paid" };

  const recentResends = countRecentResends(submission, emailType, Date.now());
  if (recentResends >= RESEND_MAX_PER_WINDOW) {
    return { ok: false, reason: "rate_limited" };
  }

  const sendResult = await dispatchResend(submission, emailType);
  if (sendResult.kind !== "sent" && sendResult.kind !== "dry_run") {
    return { ok: false, reason: "send_failed" };
  }

  await appendEmailFired(submission._id, {
    type: emailType,
    sentAt: new Date().toISOString(),
    resendId: sendResult.kind === "sent" ? sendResult.resendId : null,
  });

  return {
    ok: true,
    emailType,
    targetEmailRedacted: redactEmail(resolveDeliveryAddress(submission)),
  };
}

type DispatchOutcome =
  | { kind: "sent"; resendId: string }
  | { kind: "dry_run" }
  | { kind: "skipped"; reason: string }
  | { kind: "failed"; error: string };

async function dispatchResend(
  submission: SubmissionRecord,
  emailType: ResendableEmailType,
): Promise<DispatchOutcome> {
  const context = buildSubmissionContext(submission);
  switch (emailType) {
    case "order_confirmation": {
      return sendOrderConfirmation(context);
    }
    case "day7": {
      if (!submission.recipientUserId) {
        return { kind: "failed", error: "missing recipientUserId" };
      }
      // Cap admin-resend TTL so a token can't outlive the reading retention window.
      const deliveredAtMs = submission.deliveredAt
        ? Date.parse(submission.deliveredAt)
        : null;
      const msUntilReadingExpires =
        deliveredAtMs !== null
          ? deliveredAtMs + READING_ACCESS_TTL_MS - Date.now()
          : LISTEN_TOKEN_TTL_MS;
      const cappedTtl = Math.max(
        0,
        Math.min(LISTEN_TOKEN_TTL_MS, msUntilReadingExpires),
      );
      if (cappedTtl === 0) {
        return { kind: "failed", error: "reading already expired" };
      }
      const token = await mintListenToken({
        submissionId: submission._id,
        recipientUserId: submission.recipientUserId,
        mintSource: "admin_resend",
        ttlMs: cappedTtl,
      });
      const listenUrl = `${siteOrigin()}/listen/${submission._id}?t=${token}`;
      return sendDay7Delivery(context, listenUrl);
    }
  }
}
