import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { base64UrlDecodeToBytes, base64UrlEncodeBytes } from "@/lib/hmac";

import {
  LIBRARY_TOKEN_PAYLOAD_PREFIX,
  LIBRARY_TOKEN_TTL_MS,
  mintLibraryToken,
  verifyLibraryToken,
} from "../libraryToken";

const USER_ID = "user_lib_abc123";
const NOW = 1_700_000_000_000;
const FIXED_JTI = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-library-secret-please-rotate");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("library token mint + verify", () => {
  it("round-trips a valid token with order_confirmation mint source", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const result = await verifyLibraryToken({
      token,
      now: NOW + 1_000,
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.userId).toBe(USER_ID);
      expect(result.mintSource).toBe("order_confirmation");
      expect(result.expMs).toBe(NOW + LIBRARY_TOKEN_TTL_MS);
      expect(result.jti).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it("round-trips day7_delivery mint source", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "day7_delivery",
      now: NOW,
    });
    const result = await verifyLibraryToken({ token, now: NOW + 1_000 });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.mintSource).toBe("day7_delivery");
  });

  it("round-trips gift_purchase_self_send mint source", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "gift_purchase_self_send",
      now: NOW,
    });
    const result = await verifyLibraryToken({ token, now: NOW + 1_000 });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.mintSource).toBe("gift_purchase_self_send");
  });

  it("round-trips gift_purchase_scheduled mint source", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "gift_purchase_scheduled",
      now: NOW,
    });
    const result = await verifyLibraryToken({ token, now: NOW + 1_000 });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.mintSource).toBe("gift_purchase_scheduled");
  });

  it("round-trips admin_resend mint source", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "admin_resend",
      now: NOW,
    });
    const result = await verifyLibraryToken({ token, now: NOW + 1_000 });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.mintSource).toBe("admin_resend");
  });

  it("rejects an expired token", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const result = await verifyLibraryToken({
      token,
      now: NOW + LIBRARY_TOKEN_TTL_MS + 1,
    });
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("respects custom ttlMs override", async () => {
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "admin_resend",
      ttlMs: ONE_HOUR_MS,
      now: NOW,
    });
    const stillValid = await verifyLibraryToken({ token, now: NOW + ONE_HOUR_MS - 1 });
    expect(stillValid.valid).toBe(true);
    if (stillValid.valid) expect(stillValid.expMs).toBe(NOW + ONE_HOUR_MS);
    const justExpired = await verifyLibraryToken({ token, now: NOW + ONE_HOUR_MS + 1 });
    expect(justExpired).toEqual({ valid: false, reason: "expired" });
  });

  it("returns a deterministic token when jti override supplied", async () => {
    const tokenA = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
      jti: FIXED_JTI,
    });
    const tokenB = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
      jti: FIXED_JTI,
    });
    expect(tokenA).toBe(tokenB);
    const result = await verifyLibraryToken({ token: tokenA, now: NOW + 1 });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.jti).toBe(FIXED_JTI);
  });

  it("rejects malformed tokens", async () => {
    const cases = ["", "garbage", "a.b.c", "onlyonepart", ".", "..", "a.", ".b"];
    for (const token of cases) {
      const result = await verifyLibraryToken({ token, now: NOW });
      expect(result).toEqual({ valid: false, reason: "malformed" });
    }
  });

  it("rejects a tampered userId inside the payload", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
      jti: FIXED_JTI,
    });
    const [payloadB64, sigB64] = token.split(".");
    const bytes = base64UrlDecodeToBytes(payloadB64)!;
    const decoded = new TextDecoder().decode(bytes);
    const tamperedStr = decoded.replace(USER_ID, "user_attacker_x");
    const tamperedPayloadB64 = base64UrlEncodeBytes(new TextEncoder().encode(tamperedStr));
    const tamperedToken = `${tamperedPayloadB64}.${sigB64}`;
    const result = await verifyLibraryToken({ token: tamperedToken, now: NOW + 1 });
    expect(result).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("rejects a tampered signature", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const [payloadB64] = token.split(".");
    const fakeSig = base64UrlEncodeBytes(new Uint8Array(32));
    const tamperedToken = `${payloadB64}.${fakeSig}`;
    const result = await verifyLibraryToken({ token: tamperedToken, now: NOW + 1 });
    expect(result).toEqual({ valid: false, reason: "bad_signature" });
  });

  it("rejects base64url canonicalization mismatch", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const [payloadB64, sigB64] = token.split(".");
    const ambiguousPayload = `${payloadB64}=`;
    const ambiguousToken = `${ambiguousPayload}.${sigB64}`;
    const result = await verifyLibraryToken({ token: ambiguousToken, now: NOW + 1 });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("throws explicit error from mint when AUTH_TOKEN_SECRET missing", async () => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "");
    await expect(
      mintLibraryToken({
        userId: USER_ID,
        mintSource: "order_confirmation",
        now: NOW,
      }),
    ).rejects.toThrow("AUTH_TOKEN_SECRET is required for auth tokens");
  });

  it("throws explicit error from verify when AUTH_TOKEN_SECRET missing", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    vi.stubEnv("AUTH_TOKEN_SECRET", "");
    await expect(
      verifyLibraryToken({ token, now: NOW + 1 }),
    ).rejects.toThrow("AUTH_TOKEN_SECRET is required for auth tokens");
  });

  it("does not expose plain userId in the encoded token", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    expect(token.includes(LIBRARY_TOKEN_PAYLOAD_PREFIX)).toBe(false);
  });

  it("uses full SHA-256 HMAC output (32 bytes / 43 base64url chars)", async () => {
    const token = await mintLibraryToken({
      userId: USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const [, sigB64] = token.split(".");
    const sigBytes = base64UrlDecodeToBytes(sigB64);
    expect(sigBytes).not.toBeNull();
    expect(sigBytes!.length).toBe(32);
    expect(sigB64.length).toBe(43);
  });

  it("rejects a token whose payload has the wrong field count", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = "library.v1:user:jti:order_confirmation"; // missing expMs
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("library.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyLibraryToken({ token, now: NOW });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects a token with an unknown payload prefix even if signed", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = `evil.v1:user:jti:order_confirmation:${NOW + 1_000}`;
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("library.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyLibraryToken({ token, now: NOW });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects a token whose mintSource is not in the allow-list", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = `library.v1:user:jti:hacker_source:${NOW + 1_000}`;
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("library.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyLibraryToken({ token, now: NOW });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });
});
