import { describe, expect, it } from "vitest";

import { computeFinancialRetainedUntil } from "./retention";

describe("computeFinancialRetainedUntil", () => {
  it("returns paidAt + 6 years as ISO", () => {
    expect(computeFinancialRetainedUntil("2026-04-28T12:00:00.000Z")).toBe(
      "2032-04-28T12:00:00.000Z",
    );
  });

  it("handles leap-year Feb 29 by rolling to Feb 28 six years later", () => {
    expect(computeFinancialRetainedUntil("2024-02-29T00:00:00.000Z")).toBe(
      "2030-03-01T00:00:00.000Z",
    );
  });
});
