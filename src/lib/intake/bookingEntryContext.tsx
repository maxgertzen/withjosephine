"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect } from "react";

import type { BookingEntry } from "@/lib/analytics";
import { useFirstClientRead } from "@/lib/hooks/useFirstClientRead";

import { peekBookingEntry, settleBookingEntry } from "./bookingEntry";

export const BookingEntryContext = createContext<BookingEntry | null>(null);

export function BookingEntryProvider({
  readingId,
  entry,
  children,
}: {
  readingId: string;
  entry?: BookingEntry;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const peekedEntry = useFirstClientRead(() => peekBookingEntry(readingId, pathname));
  useEffect(settleBookingEntry, []);

  return (
    <BookingEntryContext.Provider value={entry ?? peekedEntry}>
      {children}
    </BookingEntryContext.Provider>
  );
}

export function useBookingEntry(): BookingEntry | null {
  return useContext(BookingEntryContext);
}
