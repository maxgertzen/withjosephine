import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetListenTokenCache, signListenToken, verifyListenToken } from "./listenToken";

beforeEach(() => {
  vi.stubEnv("LISTEN_TOKEN_SECRET", "test-secret-deadbeef-cafebabe-feedface");
  __resetListenTokenCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetListenTokenCache();
  vi.useRealTimers();
});

describe("listenToken", () => {
  it("produces a token of shape `{base64url}.{seconds}.{hex64}`", async () => {
    const token = await signListenToken("sub_1");
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.\d+\.[0-9a-f]{64}$/);
  });

  it("verifies a freshly signed token and recovers the submissionId", async () => {
    const token = await signListenToken("submission-id-with-dashes");
    const result = await verifyListenToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.submissionId).toBe("submission-id-with-dashes");
  });

  it("returns the embedded expiresAt seconds on success", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signListenToken("sub_1", 60);
    const after = Math.floor(Date.now() / 1000);
    const result = await verifyListenToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.expiresAtSeconds).toBeGreaterThanOrEqual(before + 60);
      expect(result.expiresAtSeconds).toBeLessThanOrEqual(after + 61);
    }
  });

  it("rejects tokens whose hmac does not match the embedded submissionId", async () => {
    const tokenA = await signListenToken("sub_1");
    const tokenB = await signListenToken("sub_2");
    const [idA] = tokenA.split(".");
    const [, expiresA, ] = tokenA.split(".");
    const [, , hmacB] = tokenB.split(".");
    const forged = `${idA}.${expiresA}.${hmacB}`;
    expect(await verifyListenToken(forged)).toEqual({ valid: false, reason: "bad-signature" });
  });

  it("rejects tokens with tampered hmac", async () => {
    const token = await signListenToken("sub_1");
    const tampered = token.replace(/\.[0-9a-f]{64}$/, `.${"0".repeat(64)}`);
    expect(await verifyListenToken(tampered)).toEqual({
      valid: false,
      reason: "bad-signature",
    });
  });

  it("rejects tokens with tampered expiresAt", async () => {
    const token = await signListenToken("sub_1");
    const [idPart, , hmacPart] = token.split(".");
    const tampered = `${idPart}.9999999999.${hmacPart}`;
    expect(await verifyListenToken(tampered)).toEqual({
      valid: false,
      reason: "bad-signature",
    });
  });

  it("rejects expired tokens", async () => {
    const token = await signListenToken("sub_1", 1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + 5_000));
    const result = await verifyListenToken(token);
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects tokens missing one of three parts", async () => {
    expect(await verifyListenToken("only.two")).toEqual({ valid: false, reason: "malformed" });
    expect(await verifyListenToken("noseparatorhere")).toEqual({
      valid: false,
      reason: "malformed",
    });
  });

  it("rejects tokens with non-numeric expiresAt", async () => {
    expect(await verifyListenToken("c3ViXzE.notanumber.deadbeef")).toEqual({
      valid: false,
      reason: "malformed",
    });
  });

  it("rejects tokens with non-hex hmac portion", async () => {
    expect(await verifyListenToken(`c3ViXzE.${Math.floor(Date.now() / 1000)}.zzzzzz`)).toEqual({
      valid: false,
      reason: "malformed",
    });
  });

  it("rejects tokens with hmac of wrong length", async () => {
    const token = await signListenToken("sub_1");
    const truncated = token.slice(0, -2);
    expect(await verifyListenToken(truncated)).toEqual({ valid: false, reason: "malformed" });
  });

  it("throws when LISTEN_TOKEN_SECRET is missing", async () => {
    vi.stubEnv("LISTEN_TOKEN_SECRET", "");
    __resetListenTokenCache();
    await expect(signListenToken("sub_1")).rejects.toThrow(/LISTEN_TOKEN_SECRET/);
  });

  it("produces a different token under a different secret", async () => {
    const a = await signListenToken("sub_1");
    vi.stubEnv("LISTEN_TOKEN_SECRET", "different-secret-1234567890abcdef0000");
    __resetListenTokenCache();
    const b = await signListenToken("sub_1");
    expect(a).not.toEqual(b);
  });
});
