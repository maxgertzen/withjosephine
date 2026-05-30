import { describe, expect, it } from "vitest";

import { formatSendAt } from "../formatSendAt";

const ISO = "2026-06-13T22:00:00.000Z";

describe("formatSendAt", () => {
  it("renders in the supplied IANA timezone", () => {
    const formatted = formatSendAt(ISO, "America/Los_Angeles");
    expect(formatted).toContain("June 13, 2026");
    expect(formatted).toMatch(/3:00\s?PM/);
  });

  it("renders in Asia/Jerusalem when supplied", () => {
    const formatted = formatSendAt(ISO, "Asia/Jerusalem");
    expect(formatted).toContain("June 14, 2026");
    expect(formatted).toMatch(/1:00\s?AM/);
  });

  it("falls back to UTC when tz omitted", () => {
    const formatted = formatSendAt(ISO);
    expect(formatted).toContain("June 13, 2026");
    expect(formatted).toMatch(/10:00\s?PM/);
  });

  it("returns the raw ISO when the input is unparseable", () => {
    expect(formatSendAt("not-a-date")).toBe("not-a-date");
  });
});
