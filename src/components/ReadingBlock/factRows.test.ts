import { describe, expect, it } from "vitest";

import { factRows } from "./factRows";

describe("factRows", () => {
  it.each([
    [1, 3, [1]],
    [3, 3, [3]],
    [4, 3, [2, 2]],
    [5, 3, [3, 2]],
    [6, 3, [3, 3]],
    [6, 4, [3, 3]],
    [5, 2, [2, 2, 1]],
    [6, 6, [6]],
  ])("splits %i facts at %i per row into even rows %j", (count, perRow, rows) => {
    expect(factRows(count, perRow, true)).toEqual(rows);
  });

  it.each([
    [4, 3, [3, 1]],
    [5, 3, [3, 2]],
    [5, 4, [4, 1]],
  ])("fills rows in order when balancing is off: %i at %i is %j", (count, perRow, rows) => {
    expect(factRows(count, perRow, false)).toEqual(rows);
  });

  it("never makes a row wider than the facts it has, and treats bad widths as 1", () => {
    expect(factRows(2, 6, true)).toEqual([2]);
    expect(factRows(2, 0, true)).toEqual([1, 1]);
    expect(factRows(0, 3, true)).toEqual([]);
  });
});
