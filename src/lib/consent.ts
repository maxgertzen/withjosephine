"use client";

/**
 * Consent state lives in localStorage so the visitor's choice persists
 * across reloads and tabs. Three values:
 *
 *   - `null`       : never asked / never decided. Banner shows; SDK doesn't init.
 *   - `"granted"`  : visitor clicked Accept. SDK inits.
 *   - `"declined"` : visitor clicked Decline. SDK does not init; banner stays dismissed.
 *
 * Only consulted when the server-side region check determined the
 * visitor needs consent. Outside EU/EEA/UK/CH/CA, the SDK inits
 * unconditionally (the `consentRequired` prop is the gate).
 */

const STORAGE_KEY = "josephine.consent";

export type ConsentChoice = "granted" | "declined";

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "declined" ? value : null;
  } catch {
    // Private mode / blocked storage — treat as no choice yet, banner shows.
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Quota or blocked storage — silently swallow. Worst case the user
    // sees the banner again on reload; that's acceptable.
  }
}
