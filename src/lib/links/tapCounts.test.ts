import { describe, expect, it } from "vitest";

import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import { deleteTapsOlderThanAMonth, recordTap, tapCountsByKey } from "./tapCounts";

const NOW = new Date("2026-11-30T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("tap counts", () => {
  it("adds one per tap to that day's row for the key", async () => {
    await recordTap("home", NOW);
    await recordTap("home", NOW);
    await recordTap("reading:r1", NOW);

    expect(await dbQuery("SELECT day, link_key, count FROM tt_link_taps ORDER BY link_key")).toEqual([
      { day: "2026-11-30", link_key: "home", count: 2 },
      { day: "2026-11-30", link_key: "reading:r1", count: 1 },
    ]);
  });

  it("stores only the day, the key and the count", async () => {
    await recordTap("home", NOW);

    const columns = await dbQuery<{ name: string }>("SELECT name FROM pragma_table_info('tt_link_taps')");
    expect(columns.map(({ name }) => name).sort()).toEqual(["count", "day", "link_key"]);
  });

  it("sums the last 7 and last 30 days, today included", async () => {
    await recordTap("home", NOW);
    await recordTap("home", daysAgo(6));
    await recordTap("home", daysAgo(7));
    await recordTap("home", daysAgo(29));
    await recordTap("home", daysAgo(30));

    expect((await tapCountsByKey(NOW)).get("home")).toEqual({ last7Days: 2, last30Days: 4 });
  });

  it("deletes days older than the 30 day window", async () => {
    await recordTap("home", daysAgo(29));
    await recordTap("home", daysAgo(30));

    expect(await deleteTapsOlderThanAMonth(NOW)).toBe(1);
    expect((await tapCountsByKey(NOW)).get("home")).toEqual({ last7Days: 0, last30Days: 1 });
  });
});
