const RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const RESEND_MAX_PER_WINDOW = 3;

export function isResendLimitReached(sentAts: readonly string[], nowMs: number): boolean {
  const recent = sentAts.filter((sentAt) => {
    const sentAtMs = Date.parse(sentAt);
    return !Number.isNaN(sentAtMs) && nowMs - sentAtMs < RESEND_WINDOW_MS;
  });
  return recent.length >= RESEND_MAX_PER_WINDOW;
}
