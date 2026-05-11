import { findUnclaimedGiftByTokenHash } from "@/lib/booking/persistence/repository";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { sha256Hex } from "@/lib/hmac";

const TOKEN_BYTE_LENGTH = 32;

export type IssuedGiftClaimToken = {
  token: string;
  tokenHash: string;
  claimUrl: string;
};

function siteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://withjosephine.com";
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTE_LENGTH));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function issueGiftClaimToken(): Promise<IssuedGiftClaimToken> {
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const claimUrl = `${siteOrigin()}/gift/claim?token=${token}`;
  return { token, tokenHash, claimUrl };
}

/**
 * Validates a raw token from the claim URL by hashing it and looking up
 * an unclaimed gift submission. Returns the submission when valid, or null
 * when no match (invalid token, already claimed, or cancelled). The DB
 * lookup is by hash equality so the raw token never sits in storage.
 */
export async function verifyGiftClaimToken(
  rawToken: string,
): Promise<SubmissionRecord | null> {
  if (!rawToken || typeof rawToken !== "string") return null;
  // Strict shape check before hashing — rejects garbage early.
  if (!/^[0-9a-f]{64}$/.test(rawToken)) return null;
  const tokenHash = await sha256Hex(rawToken);
  return findUnclaimedGiftByTokenHash(tokenHash);
}
