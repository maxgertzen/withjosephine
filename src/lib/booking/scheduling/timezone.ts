import { TZDateMini } from "@date-fns/tz";

/**
 * Browser timezone resolution + datetime-local → UTC ISO conversion.
 *
 * Why this exists: a `<input type="datetime-local">` ships a wall-clock string
 * (e.g. `2026-12-25T10:00`) with no zone information. To schedule a server
 * alarm we need a UTC instant, which requires knowing which IANA zone the
 * wall-clock value belongs to. The browser usually exposes that via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` — but iOS Safari pre-17
 * can return a generic UTC offset instead of a real IANA name, so consumers
 * must be prepared to fall back to a dropdown.
 */

const IANA_TZ_PATTERN = /^(?:UTC|[A-Za-z]+(?:[/_-][A-Za-z0-9_+-]+)+)$/;

const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export const COMMON_FALLBACK_ZONES = [
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Jerusalem",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

export type CommonFallbackZone = (typeof COMMON_FALLBACK_ZONES)[number];

export function isIanaTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  return IANA_TZ_PATTERN.test(value);
}

export function resolveBrowserTimeZone(): string | null {
  if (typeof Intl === "undefined") return null;
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isIanaTimeZone(detected) ? detected : null;
}

export const LOCAL_INPUT_CONVERSION_REASON = {
  malformed: "malformed",
  unknownZone: "unknown_zone",
} as const;

export type LocalInputConversionReason =
  (typeof LOCAL_INPUT_CONVERSION_REASON)[keyof typeof LOCAL_INPUT_CONVERSION_REASON];

export type LocalInputConversion =
  | { ok: true; utcIso: string }
  | { ok: false; reason: LocalInputConversionReason };

export function localInputToUtcIso(
  localInput: string,
  timeZone: string | null,
): LocalInputConversion {
  if (!isIanaTimeZone(timeZone)) {
    return { ok: false, reason: LOCAL_INPUT_CONVERSION_REASON.unknownZone };
  }
  const match = DATETIME_LOCAL_PATTERN.exec(localInput);
  if (!match) {
    return { ok: false, reason: LOCAL_INPUT_CONVERSION_REASON.malformed };
  }
  const [, y, mo, d, h, mi, s] = match;
  const zoned = new TZDateMini(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    s ? Number(s) : 0,
    timeZone,
  );
  return { ok: true, utcIso: new Date(zoned.getTime()).toISOString() };
}
