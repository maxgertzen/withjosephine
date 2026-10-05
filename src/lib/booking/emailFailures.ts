import * as Sentry from "@sentry/cloudflare";

import type { EmailSendResult } from "../resend";
import type { NewEmailFailure } from "./persistence/repository";
import * as repo from "./persistence/repository";
import { runMirror } from "./persistence/runMirror";
import { mirrorSubmissionPatch } from "./persistence/sanityMirror";
import type { CustomerEmailType, EmailFailureEntry, EmailFailureKind } from "./submissions";

type UnsentResult = Extract<EmailSendResult, { kind: "skipped" | "failed" }>;

type FailureDetails = Pick<NewEmailFailure, "kind" | "statusCode" | "errorCode" | "errorMessage">;

export type EmailFailureFields<
  TEmailType extends string = CustomerEmailType,
  TRecipient extends string = string,
> = Pick<NewEmailFailure<TEmailType, TRecipient>, "emailType" | "kind" | "recipient"> &
  Partial<NewEmailFailure<TEmailType, TRecipient>>;

const EMAIL_ADDRESS = /[^\s<>()[\]"',;:@]+@[^\s<>()[\]"',;:@]+\.[^\s<>()[\]"',;:@]+/g;

export function scrubEmailAddresses(text: string | null | undefined): string | null {
  return text ? text.replace(EMAIL_ADDRESS, "[address]") : null;
}

export function failureFromUnsentResult(result: UnsentResult): FailureDetails {
  if (result.kind === "skipped") {
    return { kind: "refused", statusCode: null, errorCode: result.reason, errorMessage: null };
  }
  return {
    kind: result.error === "invalid_idempotent_request" ? "maybe_sent" : "send_error",
    statusCode: result.statusCode ?? null,
    errorCode: result.error,
    errorMessage: null,
  };
}

export function failureFromError(error: unknown): FailureDetails {
  return {
    kind: "send_error",
    statusCode: null,
    errorCode: null,
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

export function withFailureDefaults<TEmailType extends string, TRecipient extends string>(
  fields: EmailFailureFields<TEmailType, TRecipient>,
): NewEmailFailure<TEmailType, TRecipient> {
  return {
    attemptedAt: null,
    failedAt: new Date().toISOString(),
    statusCode: null,
    errorCode: null,
    errorMessage: null,
    bounceType: null,
    resendId: null,
    ...fields,
  };
}

type FailureOwner = { submission_id: string } | { gift_id: string };

export function reportEmailFailure(
  owner: FailureOwner,
  failure: NewEmailFailure<string, string>,
): void {
  const ownerId = Object.values(owner)[0];
  console.error(
    `[email-failure] ${failure.emailType} ${failure.kind} for ${ownerId} (${failure.errorCode ?? failure.bounceType ?? "no code"})`,
  );
  Sentry.captureMessage(`Customer email not sent: ${failure.emailType} (${failure.kind})`, {
    level: "error",
    tags: {
      ...owner,
      email_type: failure.emailType,
      failure_kind: failure.kind,
      error_code: failure.errorCode ?? "none",
      status_code: failure.statusCode ?? "none",
    },
  });
}

export async function recordEmailFailure(
  submissionId: string,
  fields: EmailFailureFields,
): Promise<void> {
  const failure = withFailureDefaults(fields);
  reportEmailFailure({ submission_id: submissionId }, failure);
  try {
    const emailFailures = await repo.appendEmailFailure(submissionId, failure);
    if (emailFailures) runMirror(mirrorSubmissionPatch(submissionId, { emailFailures }));
  } catch (error) {
    console.error(`[email-failure] storing the failure failed for ${submissionId}`, error);
  }
}

export const UNDELIVERED_KINDS: ReadonlySet<EmailFailureKind> = new Set(["bounced", "suppressed"]);

export function hasOpenUndeliveredFailure(
  failures: readonly EmailFailureEntry[] | undefined,
  emailType: CustomerEmailType,
): boolean {
  return (failures ?? []).some(
    (failure) =>
      failure.emailType === emailType && !failure.resolvedAt && UNDELIVERED_KINDS.has(failure.kind),
  );
}
