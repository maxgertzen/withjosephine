"use client";

import { createContext, type ReactNode, useContext } from "react";

const NewsletterSlotContext = createContext<ReactNode>(null);

export function NewsletterSlotProvider({ slot, children }: { slot: ReactNode; children: ReactNode }) {
  return <NewsletterSlotContext.Provider value={slot}>{children}</NewsletterSlotContext.Provider>;
}

export function NewsletterSlot() {
  return useContext(NewsletterSlotContext);
}
