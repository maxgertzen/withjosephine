"use client";

import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext, useEffect } from "react";

import type { BookingEntry } from "@/lib/analytics";
import { useFirstClientRead } from "@/lib/hooks/useFirstClientRead";

import { peekBookingEntry, settleBookingEntry } from "./bookingEntry";

export const BookingEntryContext = createContext<BookingEntry | null>(null);

export function BookingEntryProvider({
  readingId,
  children,
}: {
  readingId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const entry = useFirstClientRead(() => peekBookingEntry(readingId, pathname));
  useEffect(settleBookingEntry, []);

  return <BookingEntryContext.Provider value={entry}>{children}</BookingEntryContext.Provider>;
}

export function useBookingEntry(): BookingEntry | null {
  return useContext(BookingEntryContext);
}
