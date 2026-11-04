import { HONEYPOT_FIELD } from "@/lib/booking/constants";

export type SignupRequest = {
  email: string;
  wantsNewsletter: boolean;
  buttonKey?: string;
  turnstileToken: string;
  [HONEYPOT_FIELD]?: string;
};

export function parseSignupRequest(body: unknown): SignupRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as Record<string, unknown>;
  const { email, wantsNewsletter, buttonKey, turnstileToken } = candidate;
  const honeypot = candidate[HONEYPOT_FIELD];
  if (typeof email !== "string" || typeof wantsNewsletter !== "boolean" || typeof turnstileToken !== "string") {
    return null;
  }
  if (buttonKey !== undefined && typeof buttonKey !== "string") return null;
  if (honeypot !== undefined && typeof honeypot !== "string") return null;
  return { email, wantsNewsletter, buttonKey, turnstileToken, [HONEYPOT_FIELD]: honeypot };
}
