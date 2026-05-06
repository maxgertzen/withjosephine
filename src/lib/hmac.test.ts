import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __resetHmacKeyCache,
  base64UrlDecodeToBytes,
  base64UrlEncodeBytes,
  bytesToHex,
  hexToBytes,
  signHmacSha256,
  verifyHmacSha256,
} from "./hmac";

beforeEach(() => {
  __resetHmacKeyCache();
});

afterEach(() => {
  __resetHmacKeyCache();
});

describe("base64UrlEncodeBytes / base64UrlDecodeToBytes", () => {
  it("round-trips arbitrary bytes", () => {
    const input = new Uint8Array([0xff, 0x00, 0xa5, 0x5a, 0x10, 0xfe]);
    const encoded = base64UrlEncodeBytes(input);
    const decoded = base64UrlDecodeToBytes(encoded);
    expect(decoded).toEqual(input);
  });

  it("uses url-safe alphabet (no '+' or '/' or '=' in output)", () => {
    const input = new Uint8Array([0xfb, 0xff, 0xff, 0xfb, 0xff, 0xff]);
    const encoded = base64UrlEncodeBytes(input);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("returns null on invalid base64url input", () => {
    expect(base64UrlDecodeToBytes("@@@invalid@@@")).toBeNull();
  });
});

describe("bytesToHex / hexToBytes", () => {
  it("round-trips bytes", () => {
    const input = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = bytesToHex(input);
    expect(hex).toBe("deadbeef");
    expect(hexToBytes(hex)).toEqual(input);
  });

  it("rejects odd-length hex", () => {
    expect(hexToBytes("abc")).toBeNull();
  });

  it("rejects non-hex characters", () => {
    expect(hexToBytes("zzzz")).toBeNull();
  });

  it("enforces expectedByteLength when provided", () => {
    expect(hexToBytes("dead", 4)).toBeNull();
    expect(hexToBytes("dead", 2)).toEqual(new Uint8Array([0xde, 0xad]));
  });
});

describe("signHmacSha256 / verifyHmacSha256", () => {
  const SECRET = "test-secret-1234";

  it("signs and verifies the same payload", async () => {
    const sig = await signHmacSha256(SECRET, "hello world");
    const ok = await verifyHmacSha256(SECRET, "hello world", sig);
    expect(ok).toBe(true);
  });

  it("rejects tampered payload", async () => {
    const sig = await signHmacSha256(SECRET, "hello world");
    const ok = await verifyHmacSha256(SECRET, "hello WORLD", sig);
    expect(ok).toBe(false);
  });

  it("rejects wrong secret", async () => {
    const sig = await signHmacSha256(SECRET, "hello world");
    const ok = await verifyHmacSha256("different-secret", "hello world", sig);
    expect(ok).toBe(false);
  });

  it("returns deterministic signature for same input (uses cached key)", async () => {
    const a = await signHmacSha256(SECRET, "payload");
    const b = await signHmacSha256(SECRET, "payload");
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });
});
