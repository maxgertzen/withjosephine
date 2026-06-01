export function describeValueShape(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "missing";
  if (Array.isArray(value)) return `array(len=${value.length})`;
  return typeof value;
}
