import { formatGiftSendAtPreview } from "@/lib/booking/formatGiftSendAt";

export function TimezonePreview({
  value,
  template,
  className,
}: {
  value: string;
  template: string;
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
