import { describe, expect, it } from "vitest";

import { backupPeriodPrefix, resolveBackupPeriod } from "./period";

describe("resolveBackupPeriod", () => {
  it("returns monthly for the first Monday of the month", () => {
    // 2026-05-04 is a Monday and the first Monday of May 2026.
    const result = resolveBackupPeriod(new Date("2026-05-04T03:00:00Z"));
    expect(result).toEqual({ kind: "monthly", label: "2026-05" });
  });

  it("returns monthly when the Monday lands on the 7th (latest possible first Monday)", () => {
    // 2024-10-07 is a Monday and the first Monday of October 2024.
    const result = resolveBackupPeriod(new Date("2024-10-07T03:00:00Z"));
    expect(result).toEqual({ kind: "monthly", label: "2024-10" });
  });

  it("returns weekly for a non-first Monday", () => {
    // 2026-05-11 is the second Monday of May 2026.
    const result = resolveBackupPeriod(new Date("2026-05-11T03:00:00Z"));
    expect(result).toEqual({ kind: "weekly", label: "2026-W20" });
  });

  it("returns weekly for the fourth Monday of a month", () => {
    // 2026-05-25 is the fourth Monday of May 2026.
    const result = resolveBackupPeriod(new Date("2026-05-25T03:00:00Z"));
    expect(result.kind).toBe("weekly");
    expect(result.label).toBe("2026-W22");
  });

  it("returns weekly for a non-Monday manual invocation in the first week", () => {
    // 2026-05-07 is a Thursday in week 19, even though it's <= the 7th.
    const result = resolveBackupPeriod(new Date("2026-05-07T03:00:00Z"));
    expect(result).toEqual({ kind: "weekly", label: "2026-W19" });
  });

  it("handles ISO week year boundary: 2026-12-28 Monday is 2026-W53", () => {
    const result = resolveBackupPeriod(new Date("2026-12-28T03:00:00Z"));
    expect(result.kind).toBe("weekly");
    expect(result.label).toBe("2026-W53");
  });

  it("handles ISO week year boundary: 2027-01-04 Monday is 2027-W01", () => {
    const result = resolveBackupPeriod(new Date("2027-01-04T03:00:00Z"));
    // 2027-01-04 is the first Monday of Jan, so it goes to monthly.
    expect(result).toEqual({ kind: "monthly", label: "2027-01" });
  });

  it("handles ISO week year boundary: 2024-12-30 Monday rolls into 2025-W01", () => {
    // 2024-12-30 is a Monday; ISO week 01 of 2025 starts on this date.
    const result = resolveBackupPeriod(new Date("2024-12-30T03:00:00Z"));
    // Not the first Monday of December (Dec 2 was), so weekly.
    expect(result).toEqual({ kind: "weekly", label: "2025-W01" });
  });

  it("zero-pads single-digit months and weeks", () => {
    // 2026-01-08 is a Thursday in W02.
    const result = resolveBackupPeriod(new Date("2026-01-08T03:00:00Z"));
    expect(result).toEqual({ kind: "weekly", label: "2026-W02" });
  });
});

describe("backupPeriodPrefix", () => {
  it("formats weekly periods as weekly/<label>", () => {
    expect(backupPeriodPrefix({ kind: "weekly", label: "2026-W20" })).toBe("weekly/2026-W20");
  });

  it("formats monthly periods as monthly/<label>", () => {
    expect(backupPeriodPrefix({ kind: "monthly", label: "2026-05" })).toBe("monthly/2026-05");
  });
});
