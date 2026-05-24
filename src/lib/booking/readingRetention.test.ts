import { describe, expect, it } from "vitest";

import { isReadingExpired, READING_ACCESS_TTL_MS } from "./readingRetention";

describe("readingRetention.isReadingExpired", () => {
  const now = new Date("2026-06-01T00:00:00Z").getTime();
  const day = 24 * 60 * 60 * 1000;

  it("returns false for a never-delivered submission", () => {
    expect(isReadingExpired(null, now)).toBe(false);
    expect(isReadingExpired(undefined, now)).toBe(false);
  });

  it("returns false on day 0 (just delivered)", () => {
    expect(isReadingExpired(now, now)).toBe(false);
  });

  it("returns false on day 89 (one day before expiry)", () => {
    expect(isReadingExpired(now - 89 * day, now)).toBe(false);
  });

  it("returns false on day 90 exactly (boundary stays inside window)", () => {
    expect(isReadingExpired(now - 90 * day, now)).toBe(false);
  });

  it("returns true the millisecond after the 90d boundary", () => {
    expect(isReadingExpired(now - READING_ACCESS_TTL_MS - 1, now)).toBe(true);
  });

  it("returns true at day 200", () => {
    expect(isReadingExpired(now - 200 * day, now)).toBe(true);
  });

  it("ignores future timestamps as not-expired (clock-skew defensive)", () => {
    expect(isReadingExpired(now + 10 * day, now)).toBe(false);
  });
});
