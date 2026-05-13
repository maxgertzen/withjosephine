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
 *
 * Phase 5 Session 4b — B5.16 constant-time path: shape-mismatch and
 * shape-match-but-not-in-DB both perform a hash + a DB lookup. The lookup
 * uses a fixed placeholder hash when the shape is wrong, so the wall-clock
 * timing of "garbage token" matches "valid-shape but unknown token". Closes
 * the timing-oracle that let an attacker distinguish "your token doesn't
 * look like a SHA-256" from "your token looks fine but isn't ours" via
 * response time.
 */
const PLACEHOLDER_TOKEN_HASH = "0".repeat(64);

export async function verifyGiftClaimToken(
  rawToken: unknown,
): Promise<SubmissionRecord | null> {
  const stringInput =
    typeof rawToken === "string" && rawToken.length > 0 ? rawToken : "";
  const shapeValid = /^[0-9a-f]{64}$/.test(stringInput);
  // Always hash SOMETHING — placeholder on shape mismatch. Hash is cheap
  // and constant-time-ish; the lookup is the real timing surface.
  const computedHash = await sha256Hex(shapeValid ? stringInput : "invalid-shape");
  // Always issue the DB lookup. Placeholder hash for shape-invalid input
  // guarantees a no-match without surfacing the shape-failure earlier.
  const lookupHash = shapeValid ? computedHash : PLACEHOLDER_TOKEN_HASH;
  const match = await findUnclaimedGiftByTokenHash(lookupHash);
  return shapeValid ? match : null;
}
