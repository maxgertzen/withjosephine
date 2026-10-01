import type { BookingEntry } from "@/lib/analytics";
import { isSameOrigin } from "@/lib/utils";

import { takeHomepageCardEntry } from "./homepageCardEntry";
import { restore as restoreDraft } from "./localStorageDraft";

function landedOnAnotherPath(): boolean {
  const [documentLoad] = performance.getEntriesByType("navigation");
  if (!documentLoad) return false;
  try {
    return new URL(documentLoad.name).pathname !== window.location.pathname;
  } catch {
    return false;
  }
}

let classifiedInThisDocument = false;

function markDocumentClassified(): boolean {
  const alreadyMarked = classifiedInThisDocument;
  classifiedInThisDocument = true;
  return alreadyMarked;
}

function entryFromReferrer(referrer: string): BookingEntry {
  if (!referrer) return "direct";
  return isSameOrigin(referrer) ? "internal" : "external";
}

export function classifyBookingEntry(slug: string): BookingEntry {
  const clientSideNavigation = markDocumentClassified() || landedOnAnotherPath();
  if (takeHomepageCardEntry(slug)) return "homepage_card";
  if (restoreDraft(slug) !== null) return "draft";
  if (clientSideNavigation) return "internal";
  return entryFromReferrer(document.referrer);
}

export function isFoldedEntry(entry: BookingEntry): boolean {
  return entry === "homepage_card" || entry === "draft";
}
