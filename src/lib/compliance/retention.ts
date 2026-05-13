import "server-only";

/**
 * Reading content (intake answers, photo, voice note, PDF) retention.
 *
 * 3 years from the booking date, then permanently deleted unless the customer
 * asks for earlier deletion. Decided 2026-05-09 with privacy counsel; see
 * www/MEMORY/WORK/20260509-202915_phase4-compliance-hardening/PRD.md
 * `## Decisions`.
 */
export const READING_CONTENT_RETENTION_YEARS = 3;

/**
 * Transactional record retention.
 *
 * 6 years to satisfy UK HMRC self-assessment record-keeping (5-year floor for
 * a UK sole trader who is not tax-resident, + 1-year buffer). Single
 * source-of-truth — privacy policy, financial_records `retained_until`
 * compute, and the deletion-cascade "kept under legal obligation" wording
 * all read from this constant.
 *
 * If Josephine's accountant pushes to 7, change here and the privacy policy
 * page (Sanity content) in lockstep.
 */
export const TAX_RETENTION_YEARS = 6;

/** Returns ISO date `paidAt` + 6 years, used for `financial_records.retained_until`. */
export function computeFinancialRetainedUntil(paidAtIso: string): string {
  const paidAt = new Date(paidAtIso);
  paidAt.setUTCFullYear(paidAt.getUTCFullYear() + TAX_RETENTION_YEARS);
  return paidAt.toISOString();
}
