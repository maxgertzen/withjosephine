import { describe, expect, it } from "vitest";

import { timeChip } from "./timeChip";

const NOW = new Date("2026-04-29T12:00:00Z");

function ago(seconds: number): Date {
  return new Date(NOW.getTime() - seconds * 1000);
}

describe("timeChip", () => {
  it("returns empty string when there is no saved timestamp", () => {
    expect(timeChip(null, NOW)).toBe("");
  });

  it("returns 'Saved a moment ago' under 5 seconds", () => {
    expect(timeChip(ago(2), NOW)).toBe("Saved a moment ago");
  });

  it("returns seconds-ago wording between 5 and 60 seconds", () => {
    expect(timeChip(ago(30), NOW)).toBe("Saved 30 seconds ago");
  });

  it("returns 'Saved a minute ago' at exactly one minute", () => {
    expect(timeChip(ago(60), NOW)).toBe("Saved a minute ago");
  });

  it("returns minutes-ago wording for under an hour", () => {
    expect(timeChip(ago(5 * 60), NOW)).toBe("Saved 5 minutes ago");
  });

  it("returns 'Saved an hour ago' at exactly one hour", () => {
    expect(timeChip(ago(60 * 60), NOW)).toBe("Saved an hour ago");
  });

  it("returns hours-ago wording under a day", () => {
    expect(timeChip(ago(3 * 60 * 60), NOW)).toBe("Saved 3 hours ago");
  });

  it("returns 'Saved yesterday' at one day", () => {
    expect(timeChip(ago(24 * 60 * 60), NOW)).toBe("Saved yesterday");
  });

  it("returns days-ago wording past one day", () => {
    expect(timeChip(ago(3 * 24 * 60 * 60), NOW)).toBe("Saved 3 days ago");
  });
});
