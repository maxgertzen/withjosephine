"use client";

import { withLocalStorage } from "@/lib/browserStorage";

export const CONSENT_STORAGE_KEY = "josephine.consent";

export type ConsentChoice = "granted" | "declined";

export function readConsent() {
  return withLocalStorage(
    (storage) => {
      const value = storage.getItem(CONSENT_STORAGE_KEY);
      return value === "granted" || value === "declined" ? value : null;
    },
    null,
  );
}

export function writeConsent(choice: ConsentChoice) {
  withLocalStorage((storage) => storage.setItem(CONSENT_STORAGE_KEY, choice), undefined);
}
