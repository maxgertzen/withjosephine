import { describe, expect, it } from "vitest";

import { getReadingById, READINGS } from "./readings";

describe("readings data", () => {
  it("reading slugs match expected values", () => {
    const ids = READINGS.map((r) => r.id);
    expect(ids).toEqual(["soul-blueprint", "birth-chart", "akashic-record"]);
  });
});

describe("getReadingById", () => {
  it("returns a reading by id", () => {
    const result = getReadingById("soul-blueprint");
    expect(result?.name).toBe("Soul Blueprint");
  });

  it("returns undefined for unknown id", () => {
    expect(getReadingById("nonexistent")).toBeUndefined();
  });
});
