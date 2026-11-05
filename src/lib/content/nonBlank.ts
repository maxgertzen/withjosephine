import { stegaClean } from "@sanity/client/stega";

export function nonBlank(value: string | null | undefined): string | undefined {
  return value && stegaClean(value).trim() !== "" ? value.trim() : undefined;
}

export function linesWithText(lines: readonly unknown[] | null | undefined): string[] {
  return (lines ?? []).filter(
    (line): line is string => typeof line === "string" && nonBlank(line) !== undefined,
  );
}

type TextBlock = { _type: "block"; children?: { text?: unknown }[] };

function isTextBlock(item: unknown): item is TextBlock {
  return typeof item === "object" && item !== null && (item as { _type?: unknown })._type === "block";
}

function isPortableText(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value.every(isTextBlock);
}

function hasNoText(blocks: unknown[]): boolean {
  return blocks.every(
    (block) => isTextBlock(block) && linesWithText((block.children ?? []).map((span) => span.text)).length === 0,
  );
}

function usableOverride(value: unknown, builtIn: unknown): unknown {
  if (typeof value === "string") return nonBlank(value) === undefined ? undefined : value;
  if (Array.isArray(value) && isPortableText(builtIn) && hasNoText(value)) return undefined;
  return value ?? undefined;
}

export type Overrides<T> = { [K in keyof T]?: T[K] | null };

export function withNonBlankOverrides<T extends object>(defaults: T, overrides: Overrides<T> | null | undefined): T {
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const usable = usableOverride(overrides?.[key], defaults[key]);
    if (usable !== undefined) merged[key] = usable as T[keyof T];
  }
  return merged;
}
