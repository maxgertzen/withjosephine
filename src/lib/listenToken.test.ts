import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetListenTokenCache, signListenToken, verifyListenToken } from "./listenToken";

beforeEach(() => {
  vi.stubEnv("LISTEN_TOKEN_SECRET", "test-secret-deadbeef-cafebabe-feedface");
  __resetListenTokenCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetListenTokenCache();
});

describe("listenToken", () => {
  it("produces a token of shape `{base64url}.{hex64}`", async () => {
    const token = await signListenToken("sub_1");
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
  });

  it("verifies a freshly signed token and recovers the submissionId", async () => {
    const token = await signListenToken("submission-id-with-dashes");
    const result = await verifyListenToken(token);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.submissionId).toBe("submission-id-with-dashes");
  });

  it("rejects tokens whose hmac does not match the embedded submissionId", async () => {
    const tokenA = await signListenToken("sub_1");
    const tokenB = await signListenToken("sub_2");
    const idA = tokenA.split(".")[0];
    const hmacB = tokenB.split(".")[1];
    const forged = `${idA}.${hmacB}`;
    expect(await verifyListenToken(forged)).toEqual({ valid: false });
  });

  it("rejects tokens with tampered hmac", async () => {
    const token = await signListenToken("sub_1");
    const tampered = token.replace(/\.[0-9a-f]/, ".0");
    expect(await verifyListenToken(tampered)).toEqual({ valid: false });
  });

  it("rejects tokens missing the dot separator", async () => {
    expect(await verifyListenToken("noseparatorhere")).toEqual({ valid: false });
  });

  it("rejects tokens with non-hex hmac portion", async () => {
    expect(await verifyListenToken("c3ViXzE.zzzzzz")).toEqual({ valid: false });
  });

  it("rejects tokens with hmac of wrong length", async () => {
    const token = await signListenToken("sub_1");
    const truncated = token.slice(0, -2);
    expect(await verifyListenToken(truncated)).toEqual({ valid: false });
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
