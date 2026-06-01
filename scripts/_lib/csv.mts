import fs from "node:fs";

export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return `""`;
  const stringified = typeof value === "string" ? value : String(value);
  return `"${stringified.replace(/"/g, '""')}"`;
}

export type CsvColumn<T> = {
  name: string;
  get: (row: T) => string | number | null | undefined;
};

export function writeCsv<T>(
  path: string,
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
): void {
  const header = columns.map((c) => c.name).join(",");
  const body = rows
    .map((row) => columns.map((c) => csvEscape(c.get(row))).join(","))
    .join("\n");
  const content = rows.length > 0 ? `${header}\n${body}\n` : `${header}\n`;
  fs.writeFileSync(path, content);
}
