"use client";

import { useSyncExternalStore } from "react";

import { withLocalStorage } from "@/lib/browserStorage";
import {
  asConsentChoice,
  CONSENT_COOKIE,
  type ConsentChoice,
  consentCookie,
} from "@/lib/consentCookie";
import { sharesSiteCookies } from "@/lib/constants";
import { cookieValue } from "@/lib/cookieFlag";
import { CONSENT_API_ROUTE } from "@/lib/http/routes";
import { CONSENT_REQUIRED, CONSENT_REQUIRED_COOKIE } from "@/lib/region";

export const CONSENT_STORAGE_KEY = "josephine.consent";

const CONSENT_CHANGED_EVENT = "josephine:consent-changed";

function onProductionHost(): boolean {
  return typeof window !== "undefined" && sharesSiteCookies(window.location.hostname);
}

export function readConsent(): ConsentChoice | null {
  const shared = onProductionHost() ? asConsentChoice(cookieValue(document.cookie, CONSENT_COOKIE)) : null;
  return shared ?? withLocalStorage((storage) => asConsentChoice(storage.getItem(CONSENT_STORAGE_KEY)), null);
}

export function writeConsent(choice: ConsentChoice) {
  if (onProductionHost()) {
    document.cookie = consentCookie(choice);
    void fetch(CONSENT_API_ROUTE, { method: "POST", body: choice, keepalive: true }).catch(() => undefined);
  }
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
