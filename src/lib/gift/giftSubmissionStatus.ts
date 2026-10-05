export const GIFT_SUBMISSION_STATUS = {
  waiting: "gift_waiting",
  cancelled: "gift_cancelled",
} as const;

export type GiftSubmissionStatus =
  (typeof GIFT_SUBMISSION_STATUS)[keyof typeof GIFT_SUBMISSION_STATUS];

const GIFT_SUBMISSION_STATUSES: ReadonlySet<unknown> = new Set(
  Object.values(GIFT_SUBMISSION_STATUS),
);

export function isGiftSubmissionStatus(status: unknown): status is GiftSubmissionStatus {
  return GIFT_SUBMISSION_STATUSES.has(status);
}
