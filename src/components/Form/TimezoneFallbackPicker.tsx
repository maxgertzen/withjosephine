"use client";

import { COMMON_FALLBACK_ZONES } from "@/lib/booking/scheduling/timezone";

/**
 * Rendered only when the browser fails to expose an IANA time zone (iOS Safari
 * pre-17 returns a generic offset). The purchaser picks from a small curated
 * list; that value drives the local→UTC conversion at submit time.
 */
export function TimezoneFallbackPicker({
  id,
  value,
  onChange,
  label,
  placeholder,
}: {
  id: string;
  value: string | null;
  onChange: (next: string) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-body text-xs text-j-text-muted">{label}</span>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-sm border border-j-blush bg-j-ivory px-2 py-1.5 font-body text-sm text-j-text focus:outline-none focus:border-j-accent"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {COMMON_FALLBACK_ZONES.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
