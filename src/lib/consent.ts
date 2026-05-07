"use client";

const STORAGE_KEY = "josephine.consent";

export type ConsentChoice = "granted" | "declined";

export function readConsent() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage blocked — banner will re-show on reload, acceptable.
  }
}
