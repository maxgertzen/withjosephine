import type { BookingEntry } from "@/lib/analytics";
import { isSameOrigin } from "@/lib/utils";

import { clearHomepageCardEntry, peekHomepageCardEntry } from "./homepageCardEntry";
import { restore as restoreDraft } from "./localStorageDraft";

function landedOnAnotherPath(currentPath: string): boolean {
  const [documentLoad] = performance.getEntriesByType("navigation");
  if (!documentLoad) return false;
  try {
    return new URL(documentLoad.name).pathname !== currentPath;
  } catch {
    return false;
  }
}

let classifiedInThisDocument = false;

function entryFromReferrer(referrer: string): BookingEntry {
  if (!referrer) return "direct";
  return isSameOrigin(referrer) ? "internal" : "external";
}

export function peekBookingEntry(slug: string, currentPath: string): BookingEntry {
  if (peekHomepageCardEntry(slug)) return "homepage_card";
  if (restoreDraft(slug) !== null) return "draft";
  if (classifiedInThisDocument || landedOnAnotherPath(currentPath)) return "internal";
  return entryFromReferrer(document.referrer);
}

export function settleBookingEntry(): void {
  classifiedInThisDocument = true;
  clearHomepageCardEntry();
}

export function isFoldedEntry(entry: BookingEntry | null): boolean {
  return entry === "homepage_card" || entry === "draft";
}
