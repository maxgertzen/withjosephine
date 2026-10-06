/**
 * Pure diff logic for the D1 → Sanity reconcile cron. ADR-001: D1 is truth,
 * Sanity is a fire-and-forget mirror; this job is the belt-and-braces job
 * that catches drift on Sanity outages or transient mirror failures.
 *
 * Kept pure (no I/O) so tests can exercise the action choices without
 * standing up a Sanity client. The route orchestrates the actual fetch +
 * mirror calls.
 */

import { currentEmailFiredType } from "../emailFiredType";
import type { EmailFailureEntry, EmailFiredEntry, SubmissionRecord } from "../submissions";

const COMPARED_FIELDS = [
  "status",
  "paidAt",
  "expiredAt",
  "amountPaidCents",
  "amountPaidCurrency",
] as const;

type ComparedField = (typeof COMPARED_FIELDS)[number];

export type SanityMirrorSnapshot = {
  _id: string;
  hasEmail?: boolean;
  status?: SubmissionRecord["status"];
  paidAt?: string;
  expiredAt?: string;
  amountPaidCents?: number | null;
  amountPaidCurrency?: string | null;
  emailsFired?: EmailFiredEntry[];
  emailFailures?: Array<EmailFailureEntry & { _key?: string; _type?: string }>;
};

type ReconcilePatch = Partial<Pick<SubmissionRecord, ComparedField | "emailFailures">>;

export type ReconcileAction =
  | { kind: "skip" }
  | { kind: "create" }
  | {
      kind: "patch";
      patch: ReconcilePatch;
      missingEmails: EmailFiredEntry[];
    };

export function normalizeOptional<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function emailFiredKey(entry: EmailFiredEntry): string {
  return `${currentEmailFiredType(entry.type)}|${entry.sentAt}`;
}

export function failuresKey(failures: ReadonlyArray<Record<string, unknown>>): string {
  return JSON.stringify(
    failures.map((failure) =>
      Object.entries(failure)
        .filter(([field, value]) => value !== null && field !== "_key" && field !== "_type")
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

export function diffSubmission(
  d1: SubmissionRecord,
  sanity: SanityMirrorSnapshot | null,
): ReconcileAction {
  if (sanity === null) return { kind: "create" };
  if (d1.giftCodeId && !sanity.hasEmail) return { kind: "create" };

  const patch: ReconcilePatch = {};
  for (const field of COMPARED_FIELDS) {
    if (normalizeOptional(d1[field]) !== normalizeOptional(sanity[field])) {
      // `as` is sound here because `field` is a key of both shapes and the
      // value types match per the COMPARED_FIELDS definition.
      patch[field] = d1[field] as never;
    }
  }

  const d1Failures = d1.emailFailures ?? [];
  if (failuresKey(d1Failures) !== failuresKey(sanity.emailFailures ?? [])) {
    patch.emailFailures = d1Failures;
  }

  const sanityEmailKeys = new Set((sanity.emailsFired ?? []).map(emailFiredKey));
  const missingEmails = (d1.emailsFired ?? []).filter(
    (entry) => !sanityEmailKeys.has(emailFiredKey(entry)),
  );

  if (Object.keys(patch).length === 0 && missingEmails.length === 0) {
    return { kind: "skip" };
  }
  return { kind: "patch", patch, missingEmails };
}
