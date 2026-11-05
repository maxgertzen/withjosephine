import { stegaClean } from "@sanity/client/stega";

import { NEWSLETTER_CONSENT_TEXT_MAX_LENGTH } from "@/data/defaults";
import { HONEYPOT_FIELD } from "@/lib/booking/constants";

export type SignupRequest = {
  email: string;
  consentText: string | null;
  buttonKey?: string;
  turnstileToken: string;
  [HONEYPOT_FIELD]?: string;
};

const INVALID = Symbol("invalid");

function parseConsentText(value: unknown): string | null | typeof INVALID {
  if (value === null) return null;
  if (typeof value !== "string") return INVALID;
  const shownWords = stegaClean(value).trim();
  if (shownWords === "" || shownWords.length > NEWSLETTER_CONSENT_TEXT_MAX_LENGTH) return INVALID;
  return shownWords;
}

export function parseSignupRequest(body: unknown): SignupRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as Record<string, unknown>;
  const { email, buttonKey, turnstileToken } = candidate;
  const consentText = parseConsentText(candidate.consentText);
  const honeypot = candidate[HONEYPOT_FIELD];
  if (typeof email !== "string" || consentText === INVALID || typeof turnstileToken !== "string") {
    return null;
  }
  if (buttonKey !== undefined && typeof buttonKey !== "string") return null;
  if (honeypot !== undefined && typeof honeypot !== "string") return null;
  return { email, consentText, buttonKey, turnstileToken, [HONEYPOT_FIELD]: honeypot };
}
