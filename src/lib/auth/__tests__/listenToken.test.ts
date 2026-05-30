import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { base64UrlDecodeToBytes, base64UrlEncodeBytes } from "@/lib/hmac";

import {
  LISTEN_TOKEN_PAYLOAD_PREFIX,
  LISTEN_TOKEN_TTL_MS,
  mintListenToken,
  verifyListenToken,
} from "../listenToken";

const SUBMISSION_ID = "sub_abc123";
const RECIPIENT_USER_ID = "user_recipient_xyz";
const NOW = 1_700_000_000_000;
const FIXED_JTI = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-secret-please-rotate");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listen token mint + verify", () => {
  it("round-trips a valid token with cron_day7 mint source", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + 1_000,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.submissionId).toBe(SUBMISSION_ID);
      expect(result.mintSource).toBe("cron_day7");
      expect(result.expMs).toBe(NOW + LISTEN_TOKEN_TTL_MS);
      expect(result.jti).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("round-trips admin_resend mint source", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "admin_resend",
      now: NOW,
    });
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + 1_000,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.mintSource).toBe("admin_resend");
    }
  });

  it("rejects an expired token", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + LISTEN_TOKEN_TTL_MS + 1,
    });
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("respects custom ttlMs override", async () => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "admin_resend",
      ttlMs: ONE_HOUR_MS,
      now: NOW,
    });
    const stillValid = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + ONE_HOUR_MS - 1,
    });
    expect(stillValid.valid).toBe(true);
    if (stillValid.valid) expect(stillValid.expMs).toBe(NOW + ONE_HOUR_MS);
    const justExpired = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + ONE_HOUR_MS + 1,
    });
    expect(justExpired).toEqual({ valid: false, reason: "expired" });
  });

  it("returns a deterministic token when jti override supplied", async () => {
    const tokenA = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
      jti: FIXED_JTI,
    });
    const tokenB = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
      jti: FIXED_JTI,
    });
    expect(tokenA).toBe(tokenB);
    const result = await verifyListenToken({
      token: tokenA,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + 1,
    });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.jti).toBe(FIXED_JTI);
  });

  it("rejects malformed tokens", async () => {
    const cases = ["", "garbage", "a.b.c", "onlyonepart", ".", "..", "a.", ".b"];
    for (const token of cases) {
      const result = await verifyListenToken({
        token,
        currentRecipientUserId: RECIPIENT_USER_ID,
        now: NOW,
      });
      expect(result).toEqual({ valid: false, reason: "malformed" });
    }
  });

  it("rejects a tampered submissionId inside the payload", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
      jti: FIXED_JTI,
    });
    const [payloadB64, sigB64] = token.split(".");
    const bytes = base64UrlDecodeToBytes(payloadB64)!;
    const decoded = new TextDecoder().decode(bytes);
    const tamperedStr = decoded.replace(SUBMISSION_ID, "sub_attacker");
    const tamperedPayloadB64 = base64UrlEncodeBytes(new TextEncoder().encode(tamperedStr));
    const tamperedToken = `${tamperedPayloadB64}.${sigB64}`;
    const result = await verifyListenToken({
      token: tamperedToken,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + 1,
    });
    expect(result).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("rejects a tampered signature", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    const [payloadB64] = token.split(".");
    const fakeSig = base64UrlEncodeBytes(new Uint8Array(32));
    const tamperedToken = `${payloadB64}.${fakeSig}`;
    const result = await verifyListenToken({
      token: tamperedToken,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + 1,
    });
    expect(result).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("rejects base64url canonicalization mismatch", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    const [payloadB64, sigB64] = token.split(".");
    // Insert padding which decodes to the same bytes but won't byte-equal re-encode.
    const ambiguousPayload = `${payloadB64}=`;
    const ambiguousToken = `${ambiguousPayload}.${sigB64}`;
    const result = await verifyListenToken({
      token: ambiguousToken,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW + 1,
    });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects recipient_changed when current recipient hash differs", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: "user_someone_else",
      now: NOW + 1,
    });
    expect(result).toEqual({ valid: false, reason: "recipient_changed" });
  });

  it("throws explicit error from mint when AUTH_TOKEN_SECRET missing", async () => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "");
    await expect(
      mintListenToken({
        submissionId: SUBMISSION_ID,
        recipientUserId: RECIPIENT_USER_ID,
        mintSource: "cron_day7",
        now: NOW,
      }),
    ).rejects.toThrow("AUTH_TOKEN_SECRET is required for auth tokens");
  });

  it("throws explicit error from verify when AUTH_TOKEN_SECRET missing", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    vi.stubEnv("AUTH_TOKEN_SECRET", "");
    await expect(
      verifyListenToken({
        token,
        currentRecipientUserId: RECIPIENT_USER_ID,
        now: NOW + 1,
      }),
    ).rejects.toThrow("AUTH_TOKEN_SECRET is required for auth tokens");
  });

  it("does not expose plain submissionId in the encoded token", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    // The encoded base64url payload must not contain the literal id.
    const [payloadB64] = token.split(".");
    expect(payloadB64.includes(SUBMISSION_ID)).toBe(false);
    expect(token.includes(RECIPIENT_USER_ID)).toBe(false);
    expect(token.includes(LISTEN_TOKEN_PAYLOAD_PREFIX)).toBe(false);
  });

  it("uses full SHA-256 HMAC output (32 bytes / 43 base64url chars)", async () => {
    const token = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "cron_day7",
      now: NOW,
    });
    const [, sigB64] = token.split(".");
    const sigBytes = base64UrlDecodeToBytes(sigB64);
    expect(sigBytes).not.toBeNull();
    expect(sigBytes!.length).toBe(32);
    expect(sigB64.length).toBe(43);
  });

  it("rejects a token whose payload has the wrong field count", async () => {
    // Hand-craft a payload that signs cleanly but has 5 segments instead of 6.
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = "listen.v1:sub:hash:jti:cron_day7"; // missing expMs
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("listen.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects a token with an unknown payload prefix even if signed", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = "evil.v1:sub:hash:jti:cron_day7:9999999999999";
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("listen.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects a token whose mintSource is not in the allow-list", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = `listen.v1:sub:hash:jti:hacker_source:${NOW + 1_000}`;
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("listen.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyListenToken({
      token,
      currentRecipientUserId: RECIPIENT_USER_ID,
      now: NOW,
    });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });
});
