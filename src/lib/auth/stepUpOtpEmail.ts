import "server-only";

/**
 * **TODO Agent B (Email):** This file is a forward-declared stub so Agent A
 * (API layer) can wire `/api/auth/step-up/request` against the contract
 * without blocking on the email template. Agent B's PR exports
 * `sendStepUpOtpEmail` from `src/lib/resend.tsx` with the same signature;
 * the merge resolution should:
 *   1. Delete this file.
 *   2. Update the import in `src/app/api/auth/step-up/request/route.ts`
 *      from `@/lib/auth/stepUpOtpEmail` to `@/lib/resend`.
 *
 * Stub behavior: returns `{ kind: "skipped", reason: "stub_not_implemented" }`
 * so the route can still flow end-to-end in tests + dev. Production never
 * reaches this stub once Agent B's PR lands.
 */

export type StepUpOtpEmailResult =
  | { kind: "sent"; resendId: string }
  | { kind: "dry_run" }
  | { kind: "skipped"; reason: string }
  | { kind: "failed"; error: string };

export type SendStepUpOtpEmailArgs = {
  code: string;
  toEmail: string;
  ipHash: string | null;
  dryRunHeader: string | null;
};

export async function sendStepUpOtpEmail(
  args: SendStepUpOtpEmailArgs,
): Promise<StepUpOtpEmailResult> {
  // Touch args so the linter doesn't flag it; Agent B's PR replaces this
  // stub with the real Resend send (which uses every field).
  void args.code;
  void args.toEmail;
  void args.ipHash;
  void args.dryRunHeader;
  return { kind: "skipped", reason: "stub_not_implemented" };
}
