"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import type { BookingEntry } from "@/lib/analytics";

import { peekBookingEntry, settleBookingEntry } from "./bookingEntry";

export const BookingEntryContext = createContext<BookingEntry | null>(null);

const noopSubscribe = () => () => {};
const unknownOnServer = () => null;

function firstReadOf(readingId: string, pathname: string): () => BookingEntry {
  let entry: BookingEntry | undefined;
  return () => (entry ??= peekBookingEntry(readingId, pathname));
}

export function BookingEntryProvider({
  readingId,
  children,
}: {
  readingId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [readEntry] = useState(() => firstReadOf(readingId, pathname));
  const entry = useSyncExternalStore(noopSubscribe, readEntry, unknownOnServer);
  useEffect(settleBookingEntry, []);

  return <BookingEntryContext.Provider value={entry}>{children}</BookingEntryContext.Provider>;
}

export function useBookingEntry(): BookingEntry | null {
  return useContext(BookingEntryContext);
}
