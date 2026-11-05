"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { NewsletterBlockWords } from "@/lib/signup/newsletterContent";

export type NewsletterSlotValue = { words: NewsletterBlockWords; footerBox: ReactNode } | null;

const NewsletterSlotContext = createContext<NewsletterSlotValue>(null);

export function NewsletterSlotProvider({ slot, children }: { slot: NewsletterSlotValue; children: ReactNode }) {
  return <NewsletterSlotContext.Provider value={slot}>{children}</NewsletterSlotContext.Provider>;
}

export function NewsletterSlot() {
  return useContext(NewsletterSlotContext)?.footerBox ?? null;
}

export function useNewsletterWords(): NewsletterBlockWords | null {
  return useContext(NewsletterSlotContext)?.words ?? null;
}
