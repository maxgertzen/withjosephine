"use client";

import { withStorage } from "@/lib/browserStorage";

const STORAGE_KEY = "josephine.consent";

export type ConsentChoice = "granted" | "declined";

export function readConsent() {
  return withStorage(
    "localStorage",
    (storage) => {
      const value = storage.getItem(STORAGE_KEY);
      return value === "granted" || value === "declined" ? value : null;
    },
    null,
  );
}

export function writeConsent(choice: ConsentChoice) {
  withStorage("localStorage", (storage) => storage.setItem(STORAGE_KEY, choice), undefined);
}
