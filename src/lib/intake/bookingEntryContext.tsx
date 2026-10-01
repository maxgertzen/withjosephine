"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect } from "react";

import type { BookingEntry } from "@/lib/analytics";
import { useFirstClientRead } from "@/lib/hooks/useFirstClientRead";

import { peekBookingEntry, settleBookingEntry } from "./bookingEntry";
import { peekEntryClick } from "./entryMarker";

export const BookingEntryContext = createContext<BookingEntry | null>(null);
export const PickedOnOtherReadingFormContext = createContext(false);

export function BookingEntryProvider({
  readingId,
  children,
}: {
  readingId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const entry = useFirstClientRead(() => peekBookingEntry(readingId, pathname));
  const pickedOnOtherReadingForm =
    useFirstClientRead(() => peekEntryClick(readingId, "reading_switch")) === true;
  useEffect(settleBookingEntry, []);

  return (
    <BookingEntryContext.Provider value={entry}>
      <PickedOnOtherReadingFormContext.Provider value={pickedOnOtherReadingForm}>
        {children}
      </PickedOnOtherReadingFormContext.Provider>
    </BookingEntryContext.Provider>
  );
}

export function useBookingEntry(): BookingEntry | null {
  return useContext(BookingEntryContext);
}

export function usePickedOnOtherReadingForm(): boolean {
  return useContext(PickedOnOtherReadingFormContext);
}
