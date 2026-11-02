"use client";

import { useSyncExternalStore } from "react";

import { withLocalStorage } from "@/lib/browserStorage";
import { sharesSiteCookies,SITE_DOMAIN } from "@/lib/constants";
import { cookieValue } from "@/lib/cookieFlag";
import { CONSENT_REQUIRED, CONSENT_REQUIRED_COOKIE } from "@/lib/region";

export const CONSENT_STORAGE_KEY = "josephine.consent";
export const CONSENT_COOKIE = "josephine_consent";

const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConsentChoice = "granted" | "declined";

const CONSENT_CHANGED_EVENT = "josephine:consent-changed";


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
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

function consentRequiredHere(): boolean {
  return typeof document === "undefined" || cookieValue(document.cookie, CONSENT_REQUIRED_COOKIE) !== CONSENT_REQUIRED.no;
}

export function thirdPartyContentAllowed(): boolean {
  return !consentRequiredHere() || readConsent() === "granted";
}

function subscribeToConsent(onChange: () => void): () => void {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const UNKNOWN_UNTIL_THE_PAGE_STARTS = () => null;

export function useThirdPartyContentAllowed(): boolean | null {
  return useSyncExternalStore(subscribeToConsent, thirdPartyContentAllowed, UNKNOWN_UNTIL_THE_PAGE_STARTS);
}
