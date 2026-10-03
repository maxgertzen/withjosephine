export function factRows(count: number, perRow: number, balance: boolean): number[] {
  if (count <= 0) return [];
  const width = Math.min(Math.max(1, Math.round(perRow) || 1), count);
  const rowCount = Math.ceil(count / width);
  if (!balance) {
    return Array.from({ length: rowCount }, (_, index) => Math.min(width, count - index * width));
  }
  const base = Math.floor(count / rowCount);
  const longerRows = count % rowCount;
  return Array.from({ length: rowCount }, (_, index) => base + (index < longerRows ? 1 : 0));
}
