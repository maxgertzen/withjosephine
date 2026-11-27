import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { base64UrlEncodeBytes, sha256Hex } from "@/lib/hmac";

import {
  EXPORT_TOKEN_PAYLOAD_PREFIX,
  EXPORT_TOKEN_TTL_MS,
  exportTokenRecipientMatches,
  mintExportToken,
  verifyExportToken,
} from "../exportToken";

const SUBMISSION_ID = "sub_abc123";
const SUBMISSION_ID_B = "sub_other456";
const RECIPIENT_USER_ID = "user_recipient_xyz";
const NOW = 1_700_000_000_000;
const FIXED_JTI = "0123456789abcdef0123456789abcdef";

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-secret-please-rotate");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("export token mint + verify", () => {
  it("round-trips a valid token with order_confirmation mint source", async () => {
    const token = await mintExportToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const result = await verifyExportToken({ token, now: NOW + 1_000 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.submissionId).toBe(SUBMISSION_ID);
      expect(result.mintSource).toBe("order_confirmation");
      expect(result.expMs).toBe(NOW + EXPORT_TOKEN_TTL_MS);
      expect(result.jti).toMatch(/^[0-9a-f]{32}$/);
      expect(result.recipientUserIdHash).toBe(await sha256Hex(RECIPIENT_USER_ID));
    }
  });

  it("round-trips admin_resend mint source", async () => {
    const token = await mintExportToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "admin_resend",
      now: NOW,
    });
    const result = await verifyExportToken({ token, now: NOW + 1_000 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.mintSource).toBe("admin_resend");
    }
  });

  it("defaults to a one-year TTL", async () => {
    expect(EXPORT_TOKEN_TTL_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it("rejects an expired token", async () => {
    const token = await mintExportToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const result = await verifyExportToken({
      token,
      now: NOW + EXPORT_TOKEN_TTL_MS + 1,
    });
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("a token minted for order A only ever authorizes order A (cross-order isolation)", async () => {
    const tokenForA = await mintExportToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const tokenForB = await mintExportToken({
      submissionId: SUBMISSION_ID_B,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const resultA = await verifyExportToken({ token: tokenForA, now: NOW + 1 });
    const resultB = await verifyExportToken({ token: tokenForB, now: NOW + 1 });
    expect(resultA.valid && resultA.submissionId).toBe(SUBMISSION_ID);
    expect(resultB.valid && resultB.submissionId).toBe(SUBMISSION_ID_B);
    // The two tokens never collide: A's token can never resolve to B's order.
    expect(resultA.valid && resultA.submissionId).not.toBe(SUBMISSION_ID_B);
  });

  it("does not expose plain submissionId or recipient in the encoded token", async () => {
    const token = await mintExportToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "order_confirmation",
      now: NOW,
    });
    const [payloadB64] = token.split(".");
    expect(payloadB64.includes(SUBMISSION_ID)).toBe(false);
    expect(token.includes(RECIPIENT_USER_ID)).toBe(false);
    expect(token.includes(EXPORT_TOKEN_PAYLOAD_PREFIX)).toBe(false);
  });

  it("rejects a token with an unknown payload prefix even if signed", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = `listen.v1:sub:hash:jti:order_confirmation:${NOW + 1_000}`;
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("export.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyExportToken({ token, now: NOW });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("rejects a token whose mintSource is not in the allow-list", async () => {
    const { signHmacSha256 } = await import("@/lib/hmac");
    const badPayload = `export.v1:sub:hash:jti:hacker_source:${NOW + 1_000}`;
    const { deriveTokenSubkeyHex } = await import("@/lib/auth/tokenSubkey");
    const secret = await deriveTokenSubkeyHex("export.v1");
    const sig = await signHmacSha256(secret, badPayload);
    const token = `${base64UrlEncodeBytes(new TextEncoder().encode(badPayload))}.${base64UrlEncodeBytes(sig)}`;
    const result = await verifyExportToken({ token, now: NOW });
    expect(result).toEqual({ valid: false, reason: "malformed" });
  });

  it("does not share a signing subkey with the listen token", async () => {
    const { mintListenToken } = await import("../listenToken");
    const listenToken = await mintListenToken({
      submissionId: SUBMISSION_ID,
      recipientUserId: RECIPIENT_USER_ID,
      mintSource: "reading_delivery",
      now: NOW,
      jti: FIXED_JTI,
    });
    // A listen token must not verify as an export token even structurally.
    const result = await verifyExportToken({ token: listenToken, now: NOW + 1 });
    expect(result).toEqual({ valid: false, reason: "bad_signature" });
  });
});

describe("exportTokenRecipientMatches", () => {
  it("matches when the current recipient equals the bound recipient", async () => {
    const hash = await sha256Hex(RECIPIENT_USER_ID);
    expect(await exportTokenRecipientMatches(hash, RECIPIENT_USER_ID)).toBe(true);
  });

  it("rejects when the order's recipient has changed since mint", async () => {
    const hash = await sha256Hex(RECIPIENT_USER_ID);
    expect(await exportTokenRecipientMatches(hash, "user_someone_else")).toBe(false);
  });
});
