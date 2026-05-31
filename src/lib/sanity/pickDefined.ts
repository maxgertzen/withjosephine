/**
 * Sanity returns `null` (not absent) for unset optional fields, so
 * `{ ...DEFAULTS, ...sanity }` blanks the default. Filter before merging.
 * Empty string, `0`, and `false` are preserved.
 */
export function pickDefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    if (value != null) out[key] = value;
  }
  return out;
}
