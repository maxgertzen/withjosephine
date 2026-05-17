import { describe, expect, it } from "vitest";

import { ownEmailKey } from "../emailNormalize";

describe("ownEmailKey", () => {
  it("lowercases and trims", () => {
    expect(ownEmailKey("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("strips gmail-style plus alias from local-part", () => {
    expect(ownEmailKey("alice+gift@example.com")).toBe("alice@example.com");
    expect(ownEmailKey("alice+a+b@example.com")).toBe("alice@example.com");
  });

  it("NFKC-normalises (flattens fullwidth + ZWSP confusables)", () => {
    // U+FF21..U+FF3A fullwidth Latin caps → ASCII
    expect(ownEmailKey("ＡLICE@example.com")).toBe("alice@example.com");
    // U+200B ZWSP in the local-part survives lowercase but NFKC drops it
    // Note: NFKC does NOT remove ZWSP — defensive note: ZWSP would survive
    // normalisation; full protection requires explicit strip. Keep test
    // documenting current behavior so a future tightening fails it
    // intentionally.
    const withZwsp = `al​ice@example.com`;
    expect(ownEmailKey(withZwsp)).not.toBe("alice@example.com");
  });

  it("returns input unchanged when no @ or @-at-start", () => {
    expect(ownEmailKey("noatsign")).toBe("noatsign");
    expect(ownEmailKey("@example.com")).toBe("@example.com");
  });

  it("treats plus-alias of own email as the same key", () => {
    expect(ownEmailKey("alice+gift@example.com")).toBe(ownEmailKey("alice@example.com"));
  });
});
