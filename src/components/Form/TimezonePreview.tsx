import { formatGiftSendAtPreview } from "@/lib/booking/formatGiftSendAt";

const TEMPLATE_TOKEN = {
  date: /\{date\}/g,
  tz: /\{tz\}/g,
} as const;

export function TimezonePreview({
  value,
  template,
  timeZone,
  className,
}: {
  value: string;
  template: string;
  timeZone?: string | null;
  className?: string;
}) {
  const formatted = formatGiftSendAtPreview(value);
  if (formatted === null) return null;
  const zoneLabel = timeZone ?? "your local time";
  const message = template
    .replace(TEMPLATE_TOKEN.date, formatted)
    .replace(TEMPLATE_TOKEN.tz, zoneLabel);
  return (
    <span
      aria-live="polite"
      className={className ?? "font-body text-xs text-j-text-muted italic mt-1"}
    >
      {message}
    </span>
  );
}
