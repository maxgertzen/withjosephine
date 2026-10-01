"use client";

import { useEffect, useRef } from "react";

import { type ReadingId, track } from "@/lib/analytics";
import { isFoldedEntry } from "@/lib/intake/bookingEntry";
import { useBookingEntry } from "@/lib/intake/bookingEntryContext";

export function EntryPageView({ readingId }: { readingId: ReadingId }) {
  const entry = useBookingEntry();
  const fired = useRef(false);
  useEffect(() => {
    if (entry === null || fired.current) return;
    fired.current = true;
    track("entry_page_view", {
      reading_id: readingId,
      referrer: document.referrer,
      viewport_width: window.innerWidth,
      entry,
      folded: isFoldedEntry(entry),
    });
  }, [entry, readingId]);
  return null;
}
