import { describe, expect, it } from "vitest";

import { formatLongDate } from "./formatDate";

describe("formatLongDate", () => {
  it("writes the day, the month name and the year", () => {
    expect(formatLongDate("2026-10-03T09:00:00.000Z")).toBe("3 October 2026");
  });

  it("returns a value it cannot read as a date unchanged", () => {
    expect(formatLongDate("soon")).toBe("soon");
  });
});
