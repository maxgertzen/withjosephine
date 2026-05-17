import { redactEmail, sendDay2Started, sendDay7Delivery, sendOrderConfirmation } from "../resend";
import {
  appendEmailFired,
  buildSubmissionContext,
  type EmailFiredType,
  findSubmissionById,
  type SubmissionRecord,
} from "./submissions";

export type ResendableEmailType = "order_confirmation" | "day2" | "day7";

export const RESENDABLE_EMAIL_TYPES: readonly ResendableEmailType[] = [
  "order_confirmation",
  "day2",
  "day7",
];

export type ResendRefusalReason =
  | "not_found"
  | "not_paid"
  | "rate_limited"
  | "send_failed"
  | "missing_listen_url";

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
  if (sendResult.kind === "missing_listen_url") {
    return { ok: false, reason: "missing_listen_url" };
  }
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
    targetEmailRedacted: redactEmail(submission.email),
  };
}

type DispatchOutcome =
  | { kind: "sent"; resendId: string }
  | { kind: "dry_run" }
  | { kind: "skipped"; reason: string }
  | { kind: "failed"; error: string }
  | { kind: "missing_listen_url" };

async function dispatchResend(
  submission: SubmissionRecord,
  emailType: ResendableEmailType,
): Promise<DispatchOutcome> {
  const context = buildSubmissionContext(submission);
  switch (emailType) {
    case "order_confirmation":
      return sendOrderConfirmation(context);
    case "day2":
      return sendDay2Started(context);
    case "day7": {
      const listenUrl = submission.voiceNoteUrl ?? submission.pdfUrl ?? "";
      if (!listenUrl) return { kind: "missing_listen_url" };
      return sendDay7Delivery(context, listenUrl);
    }
  }
}
