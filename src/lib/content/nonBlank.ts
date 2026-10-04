export function nonBlank(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function withNonBlankOverrides<T extends { [K in keyof T]: string }>(
  defaults: T,
  overrides: Partial<Record<keyof T, string | null>> | null | undefined,
): T {
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    merged[key] = (nonBlank(overrides?.[key]) ?? defaults[key]) as T[keyof T];
  }
  return merged;
}
