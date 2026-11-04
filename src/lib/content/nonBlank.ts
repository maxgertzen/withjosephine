import { stegaClean } from "@sanity/client/stega";

export function nonBlank(value: string | null | undefined): string | undefined {
  return value && stegaClean(value).trim() !== "" ? value.trim() : undefined;
}

export function linesWithText(lines: readonly unknown[] | null | undefined): string[] {
  return (lines ?? []).filter(
    (line): line is string => typeof line === "string" && nonBlank(line) !== undefined,
  );
}

function isBlankPortableText(value: unknown[]): boolean {
  return value.every(
    (block) =>
      typeof block === "object" &&
      block !== null &&
      (block as { _type?: unknown })._type === "block" &&
      linesWithText(((block as { children?: { text?: unknown }[] }).children ?? []).map((span) => span.text)).length === 0,
  );
}

function usableOverride(value: unknown): unknown {
  if (typeof value === "string") return nonBlank(value);
  if (Array.isArray(value) && isBlankPortableText(value)) return undefined;
  return value ?? undefined;
}

export function withNonBlankOverrides<T extends object>(
  defaults: T,
  overrides: { [K in keyof T]?: T[K] | null } | null | undefined,
): T {
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const usable = usableOverride(overrides?.[key]);
    if (usable !== undefined) merged[key] = usable as T[keyof T];
  }
  return merged;
}
