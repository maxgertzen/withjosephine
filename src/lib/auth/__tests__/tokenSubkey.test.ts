import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveTokenSubkeyHex } from "@/lib/auth/tokenSubkey";

describe("deriveTokenSubkeyHex", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "test-master-secret-please-rotate");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws when AUTH_TOKEN_SECRET is missing", async () => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "");
    await expect(deriveTokenSubkeyHex("listen.v1")).rejects.toThrow(
      "AUTH_TOKEN_SECRET is required",
    );
  });

  it("returns a 64-char hex string (256-bit subkey)", async () => {
    const subkey = await deriveTokenSubkeyHex("listen.v1");
    expect(subkey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the same subkey for the same purpose + master", async () => {
    const a = await deriveTokenSubkeyHex("listen.v1");
    const b = await deriveTokenSubkeyHex("listen.v1");
    expect(a).toBe(b);
  });

  it("produces different subkeys for different purposes", async () => {
    const listen = await deriveTokenSubkeyHex("listen.v1");
    const library = await deriveTokenSubkeyHex("library.v1");
    expect(listen).not.toBe(library);
  });

  it("produces different subkeys when the master changes", async () => {
    const first = await deriveTokenSubkeyHex("listen.v1");
    vi.stubEnv("AUTH_TOKEN_SECRET", "different-master-secret");
    const second = await deriveTokenSubkeyHex("listen.v1");
    expect(first).not.toBe(second);
  });
});
