import * as Sentry from "@sentry/cloudflare";

import type { EmailSendResult } from "../resend";
import type { NewEmailFailure } from "./persistence/repository";
import * as repo from "./persistence/repository";
import { runMirror } from "./persistence/runMirror";
import { mirrorSubmissionPatch } from "./persistence/sanityMirror";
import type { CustomerEmailType, EmailFailureEntry, EmailFailureKind } from "./submissions";

type UnsentResult = Extract<EmailSendResult, { kind: "skipped" | "failed" }>;

type FailureDetails = Pick<NewEmailFailure, "kind" | "statusCode" | "errorCode" | "errorMessage">;

export type EmailFailureFields = Pick<NewEmailFailure, "emailType" | "kind" | "recipient"> &
  Partial<NewEmailFailure>;

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

function withDefaults(fields: EmailFailureFields): NewEmailFailure {
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

function reportToSentry(submissionId: string, failure: NewEmailFailure): void {
  Sentry.captureMessage(`Customer email not sent: ${failure.emailType} (${failure.kind})`, {
    level: "error",
    tags: {
      submission_id: submissionId,
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
  const failure = withDefaults(fields);
  console.error(
    `[email-failure] ${failure.emailType} ${failure.kind} for ${submissionId} (${failure.errorCode ?? failure.bounceType ?? "no code"})`,
  );
  reportToSentry(submissionId, failure);
  try {
    const emailFailures = await repo.appendEmailFailure(submissionId, failure);
    if (emailFailures) runMirror(mirrorSubmissionPatch(submissionId, { emailFailures }));
  } catch (error) {
    console.error(`[email-failure] storing the failure failed for ${submissionId}`, error);
  }
}

const UNDELIVERED_KINDS: ReadonlySet<EmailFailureKind> = new Set(["bounced", "suppressed"]);

export function hasOpenUndeliveredFailure(
  failures: readonly EmailFailureEntry[] | undefined,
  emailType: CustomerEmailType,
): boolean {
  return (failures ?? []).some(
    (failure) =>
      failure.emailType === emailType && !failure.resolvedAt && UNDELIVERED_KINDS.has(failure.kind),
  );
}
