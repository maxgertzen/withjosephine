import type { GiftEmailFiredType } from "../gift/types";
import type { CustomerEmailType } from "../page-previews/types";
import type { EmailSendResult } from "../resend";
import type { UnsentResult } from "./emailFailures";

export type ResendOutcome = "sent" | "dryRun" | "retryLater" | "failed" | "refused" | "notFound";

export type CustomerResendRequest = {
  submissionId: string;
  emailType: CustomerEmailType;
  correctedEmail: string | null;
  requestedAt: string;
};

export type GiftResendRequest = {
  submissionId: string;
  emailType: GiftEmailFiredType;
  requestedAt: string;
};

export type ResendRequest =
  | (CustomerResendRequest & { kind: "customer" })
  | (GiftResendRequest & { kind: "gift" });

const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESEND_MAX_PER_WINDOW = 3;

export function isResendLimitReached(
  entries: ReadonlyArray<{ type: string; sentAt: string }>,
  matchesType: (type: string) => boolean,
  nowMs: number,
): boolean {
  const recent = entries.filter((entry) => {
    const sentAtMs = Date.parse(entry.sentAt);
    return (
      matchesType(entry.type) && !Number.isNaN(sentAtMs) && nowMs - sentAtMs < RESEND_WINDOW_MS
    );
  });
  return recent.length >= RESEND_MAX_PER_WINDOW;
}

export async function settleResend(
  result: EmailSendResult,
  handlers: {
    recordFailure: (unsent: UnsentResult) => Promise<void>;
    recordSent: (resendId: string | null) => Promise<void>;
  },
): Promise<ResendOutcome> {
  if (result.kind === "failed" && result.error === "concurrent_idempotent_requests") {
    return "retryLater";
  }
  if (result.kind === "failed" || result.kind === "skipped") {
    await handlers.recordFailure(result);
    return "failed";
  }
  await handlers.recordSent(result.kind === "sent" ? result.resendId : null);
  return result.kind === "sent" ? "sent" : "dryRun";
}
