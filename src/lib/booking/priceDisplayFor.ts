// Empty-string fallback when reading is null (deleted / orphan / fixture).
// Centralized so the sentinel stays consistent across send-function call sites.
export function priceDisplayFor(submission: {
  reading: { priceDisplay: string } | null;
}): string {
  return submission.reading?.priceDisplay ?? "";
}
