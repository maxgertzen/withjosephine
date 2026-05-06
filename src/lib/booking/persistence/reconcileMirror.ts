/**
 * Pure diff logic for the D1 → Sanity reconcile cron. ADR-001: D1 is truth,
 * Sanity is a fire-and-forget mirror; this job is the belt-and-braces job
 * that catches drift on Sanity outages or transient mirror failures.
 *
 * Kept pure (no I/O) so tests can exercise the action choices without
 * standing up a Sanity client. The route orchestrates the actual fetch +
 * mirror calls.
 */

import type { EmailFiredEntry, SubmissionRecord } from "../submissions";

const COMPARED_FIELDS = [
  "status",
  "paidAt",
  "expiredAt",
  "deliveredAt",
  "voiceNoteUrl",
  "pdfUrl",
  "amountPaidCents",
  "amountPaidCurrency",
] as const;

type ComparedField = (typeof COMPARED_FIELDS)[number];

export type SanityMirrorSnapshot = {
  _id: string;
  status?: SubmissionRecord["status"];
  paidAt?: string;
  expiredAt?: string;
  deliveredAt?: string;
  voiceNoteUrl?: string;
  pdfUrl?: string;
  amountPaidCents?: number | null;
  amountPaidCurrency?: string | null;
  emailsFired?: EmailFiredEntry[];
};

export type ReconcileAction =
  | { kind: "skip" }
  | { kind: "create" }
  | {
      kind: "patch";
      patch: Partial<Pick<SubmissionRecord, ComparedField>>;
      missingEmails: EmailFiredEntry[];
    };

function normalizeOptional<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function emailFiredKey(entry: EmailFiredEntry): string {
  return `${entry.type}|${entry.sentAt}`;
}

export function diffSubmission(
  d1: SubmissionRecord,
  sanity: SanityMirrorSnapshot | null,
): ReconcileAction {
  if (sanity === null) return { kind: "create" };

  const patch: Partial<Pick<SubmissionRecord, ComparedField>> = {};
  for (const field of COMPARED_FIELDS) {
    if (normalizeOptional(d1[field]) !== normalizeOptional(sanity[field])) {
      // `as` is sound here because `field` is a key of both shapes and the
      // value types match per the COMPARED_FIELDS definition.
      patch[field] = d1[field] as never;
    }
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
