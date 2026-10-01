import { isPlainLeftClick } from "@/lib/utils";

export const ENTRY_CLICK_TTL_MS = 60_000;

export type EntryClick = "homepage_card" | "reading_switch";

let pendingClick: { slug: string; click: EntryClick; markedAt: number } | null = null;

export function markEntryClick(slug: string, click: EntryClick): void {
  pendingClick = { slug, click, markedAt: Date.now() };
}

export function markEntryClickOnPlainLeftClick(slug: string, click: EntryClick) {
  return (event: Parameters<typeof isPlainLeftClick>[0]) => {
    if (isPlainLeftClick(event)) markEntryClick(slug, click);
  };
}

export function peekEntryClick(slug: string, click: EntryClick): boolean {
  const pending = pendingClick;
  return (
    pending !== null &&
    pending.slug === slug &&
    pending.click === click &&
    Date.now() - pending.markedAt <= ENTRY_CLICK_TTL_MS
  );
}

export function clearEntryClick(): void {
  pendingClick = null;
}
