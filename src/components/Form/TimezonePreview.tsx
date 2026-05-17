import { formatGiftSendAtPreview } from "@/lib/booking/formatGiftSendAt";

/**
 * Inline live preview of a chosen `datetime-local` value, formatted in the
 * browser's resolved timezone. Drops in a `{date}` token-substituted
 * message under any send-at picker so the purchaser can see exactly when
 * the gift will arrive after the UTC round-trip on submit. Renders
 * nothing for empty/unparseable input.
 */
export function TimezonePreview({
  value,
  template,
  className,
}: {
  /** Raw `datetime-local` input value (e.g. `2026-12-12T09:00`). */
  value: string;
  /** Sanity-editable string with a `{date}` placeholder. */
  template: string;
  /** Optional className override; defaults to the small italic muted style. */
  className?: string;
}) {
  const formatted = formatGiftSendAtPreview(value);
  if (formatted === null) return null;
  const message = template.replace(/\{date\}/g, formatted);
  return (
    <span
      aria-live="polite"
      className={className ?? "font-body text-xs text-j-text-muted italic mt-1"}
    >
      {message}
    </span>
  );
}
