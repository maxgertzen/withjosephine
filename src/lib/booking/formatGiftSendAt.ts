/**
 * Formats a `datetime-local`-shaped string (or any value `new Date()` accepts)
 * into a long localized "Friday, December 12 at 9:00 AM"-style summary using
 * the browser's resolved timezone. Returns `null` when the input is empty
 * or unparseable so callers can early-return without a wrapper conditional.
 *
 * Shared by GiftForm (purchaser-side picker) and GiftCardActions (purchaser's
 * post-purchase edit drawer) so both surfaces agree on the format and either
 * can drop into a Sanity-templated wrapper.
 */
export function formatGiftSendAtPreview(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}
