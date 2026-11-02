import "server-only";

import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 7;
const MONTH_DAYS = 30;

export type TapCounts = { last7Days: number; last30Days: number };

function utcDay(time: Date): string {
  return time.toISOString().slice(0, 10);
}

function firstDayOfWindow(now: Date, days: number): string {
  return utcDay(new Date(now.getTime() - (days - 1) * DAY_MS));
}

export async function recordTap(linkKey: string, now = new Date()): Promise<void> {
  await dbExec(
    `INSERT INTO tt_link_taps (day, link_key, count) VALUES (?, ?, 1)
     ON CONFLICT (day, link_key) DO UPDATE SET count = count + 1`,
    [utcDay(now), linkKey],
  );
}

export async function tapCountsByKey(now = new Date()): Promise<Map<string, TapCounts>> {
  const rows = await dbQuery<{ link_key: string; last7: number; last30: number }>(
    `SELECT link_key,
            SUM(CASE WHEN day >= ? THEN count ELSE 0 END) AS last7,
            SUM(count) AS last30
       FROM tt_link_taps
      WHERE day >= ?
      GROUP BY link_key`,
    [firstDayOfWindow(now, RECENT_DAYS), firstDayOfWindow(now, MONTH_DAYS)],
  );
  return new Map(rows.map((row) => [row.link_key, { last7Days: row.last7, last30Days: row.last30 }]));
}

export async function deleteTapsOlderThanAMonth(now = new Date()): Promise<number> {
  const { rowsWritten } = await dbExec("DELETE FROM tt_link_taps WHERE day < ?", [firstDayOfWindow(now, MONTH_DAYS)]);
  return rowsWritten;
}
