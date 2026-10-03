"use client";

import { withLocalStorage } from "@/lib/browserStorage";

const STORAGE_KEY = "josephine.consent";

export type ConsentChoice = "granted" | "declined";

export function readConsent() {
  return withLocalStorage(
    (storage) => {
      const value = storage.getItem(STORAGE_KEY);
      return value === "granted" || value === "declined" ? value : null;
    },
    null,
  );
}

export function writeConsent(choice: ConsentChoice) {
  withLocalStorage((storage) => storage.setItem(STORAGE_KEY, choice), undefined);
}
