import { describe, expect, it } from "vitest";

import { CRON_DISPATCH, dispatchPathsForCron } from "./cron-routes";

describe("CRON_DISPATCH", () => {
  it("covers every wrangler cron schedule with at least one route", () => {
    for (const [cron, paths] of Object.entries(CRON_DISPATCH)) {
      expect(paths.length, `cron "${cron}" has no routes`).toBeGreaterThan(0);
    }
  });

  it("uses /api/cron/ paths only — no accidental external dispatch", () => {
    for (const paths of Object.values(CRON_DISPATCH)) {
      for (const path of paths) {
        expect(path).toMatch(/^\/api\/cron\/[a-z][a-z0-9-]*$/);
      }
    }
  });

  it("does not dispatch the same path from multiple schedules", () => {
    const all = Object.values(CRON_DISPATCH).flat();
    const seen = new Set<string>();
    for (const path of all) {
      expect(seen.has(path), `duplicate dispatch: ${path}`).toBe(false);
      seen.add(path);
    }
  });
});

describe("dispatchPathsForCron", () => {
  it("returns the configured paths for a known schedule", () => {
    expect(dispatchPathsForCron("0 3 * * *")).toEqual(["/api/cron/cleanup"]);
  });

  it("returns an empty array for an unknown schedule (no throw)", () => {
    expect(dispatchPathsForCron("* * * * *")).toEqual([]);
  });
});
