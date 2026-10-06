import { type MouseEvent, useSyncExternalStore } from "react";

import { isPlainLeftClick, isSameOrigin } from "@/lib/utils";

type HistoryEntry = Pick<NavigationHistoryEntry, "url" | "index" | "key">;

type BrowserNavigation = {
  currentEntry: HistoryEntry | null;
  entries(): HistoryEntry[];
  traverseTo(key: string): unknown;
  addEventListener(type: "currententrychange", listener: () => void): void;
  removeEventListener(type: "currententrychange", listener: () => void): void;
};

type PreviousPage = { path: string; key: string | null };

function browserNavigation(): BrowserNavigation | null {
  return (globalThis as { navigation?: BrowserNavigation }).navigation ?? null;
}

function pathOf(url: string): string {
  const { pathname, search, hash } = new URL(url);
  return `${pathname}${search}${hash}`;
}

function samePage(url: string): boolean {
  const { pathname, search } = new URL(url);
  return pathname === window.location.pathname && search === window.location.search;
}

function previousEntryInTab(navigation: BrowserNavigation): PreviousPage | null {
  const index = navigation.currentEntry?.index ?? 0;
  const entries = navigation.entries();
  for (let i = index - 1; i >= 0; i -= 1) {
    const url = entries[i]?.url;
    if (!url || !isSameOrigin(url)) return null;
    if (!samePage(url)) return { path: pathOf(url), key: entries[i].key };
  }
  return null;
}

function previousPageFromReferrer(): PreviousPage | null {
  const referrer = document.referrer;
  if (!referrer || !isSameOrigin(referrer) || samePage(referrer) || window.history.length < 2) {
    return null;
  }
  return { path: pathOf(referrer), key: null };
}

function previousPage(): PreviousPage | null {
  const navigation = browserNavigation();
  return navigation ? previousEntryInTab(navigation) : previousPageFromReferrer();
}

export function previousPageOnThisSite(): string | null {
  return previousPage()?.path ?? null;
}

function subscribeToHistory(listener: () => void): () => void {
  const navigation = browserNavigation();
  navigation?.addEventListener("currententrychange", listener);
  return () => navigation?.removeEventListener("currententrychange", listener);
}

const noPreviousPageOnServer = (): string | null => null;

function goBackOnPlainClick(event: MouseEvent<HTMLAnchorElement>): void {
  if (!isPlainLeftClick(event)) return;
  const target = previousPage();
  if (!target) return;
  event.preventDefault();
  const navigation = browserNavigation();
  if (navigation && target.key) navigation.traverseTo(target.key);
  else window.history.back();
}

export function useBackLink(fallbackHref: string): {
  href: string;
  onClick: ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
} {
  const path = useSyncExternalStore(
    subscribeToHistory,
    previousPageOnThisSite,
    noPreviousPageOnServer,
  );
  return path
    ? { href: path, onClick: goBackOnPlainClick }
    : { href: fallbackHref, onClick: undefined };
}
