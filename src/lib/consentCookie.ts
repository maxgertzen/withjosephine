import { SITE_DOMAIN } from "@/lib/constants";

export const CONSENT_COOKIE = "josephine_consent";

const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ConsentChoice = "granted" | "declined";

export function asConsentChoice(value: string | null | undefined): ConsentChoice | null {
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
