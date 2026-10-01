"use client";

import { useEffect, useRef } from "react";

import { type ReadingId, track } from "@/lib/analytics";
import { classifyBookingEntry, isFoldedEntry } from "@/lib/intake/bookingEntry";

export function EntryPageView({ readingId }: { readingId: ReadingId }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const entry = classifyBookingEntry(readingId);
    track("entry_page_view", {
      reading_id: readingId,
      referrer: document.referrer,
      viewport_width: window.innerWidth,
      entry,
      folded: isFoldedEntry(entry),
    });
  }, [readingId]);
  return null;
}
