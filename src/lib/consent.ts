"use client";

import { withLocalStorage } from "@/lib/browserStorage";
import { sharesSiteCookies,SITE_DOMAIN } from "@/lib/constants";
import { cookieValue } from "@/lib/cookieFlag";

export const CONSENT_STORAGE_KEY = "josephine.consent";
export const CONSENT_COOKIE = "josephine_consent";

const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConsentChoice = "granted" | "declined";

function asChoice(value: string | null | undefined): ConsentChoice | null {
  return value === "granted" || value === "declined" ? value : null;
}

export function consentCookie(choice: ConsentChoice): string {
  return [
    `${CONSENT_COOKIE}=${choice}`,
    "Path=/",
    `Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    `Domain=.${SITE_DOMAIN}`,
    "Secure",
  ].join("; ");
}

function onProductionHost(): boolean {
  return typeof window !== "undefined" && sharesSiteCookies(window.location.hostname);
}

export function readConsent(): ConsentChoice | null {
  const shared = onProductionHost() ? asChoice(cookieValue(document.cookie, CONSENT_COOKIE)) : null;
  return shared ?? withLocalStorage((storage) => asChoice(storage.getItem(CONSENT_STORAGE_KEY)), null);
}

export function writeConsent(choice: ConsentChoice) {
  if (onProductionHost()) document.cookie = consentCookie(choice);
  withLocalStorage((storage) => storage.setItem(CONSENT_STORAGE_KEY, choice), undefined);
}
