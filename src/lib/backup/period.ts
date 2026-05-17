/**
 * First-Monday-of-month → monthly snapshot; any other day → weekly. R2
 * lifecycle rules are scoped by prefix, so the kind drives the path.
 */

export type BackupPeriod =
  | { kind: "weekly"; label: string } // "YYYY-Www" — ISO 8601 week-of-year
  | { kind: "monthly"; label: string }; // "YYYY-MM"

export function resolveBackupPeriod(now: Date): BackupPeriod {
  if (isFirstMondayOfMonth(now)) {
    return { kind: "monthly", label: formatMonthLabel(now) };
  }
  return { kind: "weekly", label: formatIsoWeekLabel(now) };
}

export function backupPeriodPrefix(period: BackupPeriod): string {
  return `${period.kind}/${period.label}`;
}

function isFirstMondayOfMonth(date: Date): boolean {
  // getUTCDay: Sunday = 0, Monday = 1.
  if (date.getUTCDay() !== 1) return false;
  return date.getUTCDate() <= 7;
}

function formatMonthLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// ISO 8601 week-of-year: week 1 contains the first Thursday. `getUTCDay`
// returns Sunday=0; normalise to ISO Monday=1..Sunday=7.
function formatIsoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
