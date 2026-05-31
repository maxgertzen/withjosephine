/**
 * Returns a shallow copy of the input with `null` and `undefined` values
 * removed. Empty strings, zero, and `false` are preserved.
 *
 * Used at every `{ ...DEFAULTS, ...pickDefined(sanity ?? {}) }` site so a
 * Sanity field returning null cannot blank the code-side default. Becky's
 * unset-an-optional-field workflow in Studio yields null rather than absent;
 * the bare spread treats null as a real override, which we never want.
 */
export function pickDefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== null && value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}
