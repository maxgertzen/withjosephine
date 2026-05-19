import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COMMON_FALLBACK_ZONES,
  isIanaTimeZone,
  localInputToUtcIso,
  resolveBrowserTimeZone,
} from "./timezone";

describe("isIanaTimeZone", () => {
  it("accepts canonical IANA names", () => {
    expect(isIanaTimeZone("America/New_York")).toBe(true);
    expect(isIanaTimeZone("Asia/Bangkok")).toBe(true);
    expect(isIanaTimeZone("Pacific/Auckland")).toBe(true);
  });

  it("rejects generic offset strings (iOS Safari pre-17 fallback)", () => {
    expect(isIanaTimeZone("+08:00")).toBe(false);
    expect(isIanaTimeZone("-0500")).toBe(false);
    expect(isIanaTimeZone("UTC+8")).toBe(false);
  });

  it("accepts bare UTC as a valid IANA zone", () => {
    expect(isIanaTimeZone("UTC")).toBe(true);
  });

  it("rejects empty / undefined / single-word values", () => {
    expect(isIanaTimeZone(undefined)).toBe(false);
    expect(isIanaTimeZone("")).toBe(false);
    expect(isIanaTimeZone("NewYork")).toBe(false);
  });
});

describe("resolveBrowserTimeZone", () => {
  const originalIntl = global.Intl;

  afterEach(() => {
    global.Intl = originalIntl;
  });

  it("returns the resolved IANA zone when Intl reports one", () => {
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "Europe/Berlin",
    } as Intl.ResolvedDateTimeFormatOptions);
    expect(resolveBrowserTimeZone()).toBe("Europe/Berlin");
    spy.mockRestore();
  });

  it("returns null when Intl reports a generic offset", () => {
    const spy = vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      timeZone: "+08:00",
    } as Intl.ResolvedDateTimeFormatOptions);
    expect(resolveBrowserTimeZone()).toBeNull();
    spy.mockRestore();
  });
});

describe("localInputToUtcIso", () => {
  it("converts a wall-clock input in Asia/Bangkok to the matching UTC instant", () => {
    const result = localInputToUtcIso("2026-12-25T10:00", "Asia/Bangkok");
    expect(result).toEqual({ ok: true, utcIso: "2026-12-25T03:00:00.000Z" });
  });

  it("converts a wall-clock input in America/New_York at EST", () => {
    const result = localInputToUtcIso("2026-01-15T09:30", "America/New_York");
    expect(result).toEqual({ ok: true, utcIso: "2026-01-15T14:30:00.000Z" });
  });

  it("handles datetime-local with seconds", () => {
    const result = localInputToUtcIso("2026-12-25T10:00:45", "Asia/Bangkok");
    expect(result).toEqual({ ok: true, utcIso: "2026-12-25T03:00:45.000Z" });
  });

  it("rejects malformed datetime-local strings", () => {
    expect(localInputToUtcIso("not-a-date", "Asia/Bangkok")).toEqual({
      ok: false,
      reason: "malformed",
    });
  });

  it("rejects unknown time zones (e.g. iOS Safari pre-17 generic offset)", () => {
    expect(localInputToUtcIso("2026-12-25T10:00", "+08:00")).toEqual({
      ok: false,
      reason: "unknown_zone",
    });
  });
});

describe("COMMON_FALLBACK_ZONES", () => {
  it("only contains canonical IANA names", () => {
    for (const zone of COMMON_FALLBACK_ZONES) {
      expect(isIanaTimeZone(zone)).toBe(true);
    }
  });
});
