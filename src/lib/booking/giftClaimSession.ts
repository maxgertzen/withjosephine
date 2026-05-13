import { cookies } from "next/headers";

import {
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  signHmacSha256,
  timingSafeStringEqual,
} from "@/lib/hmac";

export const GIFT_CLAIM_COOKIE = "__Host-gift_claim_session";
export const GIFT_CLAIM_TTL_MS = 30 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.LISTEN_TOKEN_SECRET;
  if (!secret) {
    throw new Error("LISTEN_TOKEN_SECRET is required for gift claim sessions");
  }
  return secret;
}

/**
 * Sign a short-lived claim-session cookie value scoped to a single
 * gift submission. Format: `<submissionId>.<expMs>.<sig>`. The
 * signature is HMAC-SHA-256 over `<submissionId>.<expMs>` using
 * the shared `LISTEN_TOKEN_SECRET`.
 */
export async function signGiftClaimCookie(
  submissionId: string,
  now: number = Date.now(),
): Promise<string> {
  const expMs = now + GIFT_CLAIM_TTL_MS;
  const payload = `${submissionId}.${expMs}`;
  const sig = await signHmacSha256(getSecret(), payload);
  return `${payload}.${base64UrlEncodeBytes(sig)}`;
}

/**
 * Verify a claim-session cookie. Returns the submissionId when valid and
 * unexpired, or null otherwise. Constant-time string compare on the
 * signature segment. Caller is responsible for re-checking the submission
 * state in D1 before trusting the redemption.
 */
/**
 * Set the gift claim cookie on the response. Centralises the `__Host-` cookie
 * attribute set so the claim-page and redeem-route can't drift apart on
 * security flags. Pass an empty value with maxAge: 0 via `clearGiftClaimCookie`.
 */
export async function setGiftClaimCookie(submissionId: string): Promise<void> {
  const cookieValue = await signGiftClaimCookie(submissionId);
  const jar = await cookies();
  jar.set(GIFT_CLAIM_COOKIE, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(GIFT_CLAIM_TTL_MS / 1000),
  });
}

export async function clearGiftClaimCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(GIFT_CLAIM_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function verifyGiftClaimCookie(
  cookieValue: string | undefined | null,
  now: number = Date.now(),
): Promise<string | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [submissionId, expStr, sigB64] = parts;
  if (!submissionId || !expStr || !sigB64) return null;
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || expMs <= now) return null;
  const expectedSig = await signHmacSha256(getSecret(), `${submissionId}.${expMs}`);
  const expectedB64 = base64UrlEncodeBytes(expectedSig);
  if (!timingSafeStringEqual(expectedB64, sigB64)) return null;
  // Defensive: reject if the encoded signature isn't valid base64url-decodable
  if (!base64UrlDecodeToBytes(sigB64)) return null;
  return submissionId;
}
