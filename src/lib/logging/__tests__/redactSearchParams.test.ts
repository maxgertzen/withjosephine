import { describe, expect, it } from "vitest";

import { redactSearchParams } from "../redactSearchParams";

describe("redactSearchParams", () => {
  it("redacts a single matching param on an absolute URL", () => {
    const out = redactSearchParams("https://example.com/p?t=secret", ["t"]);
    expect(out).toBe("https://example.com/p?t=%5BREDACTED%5D");
  });

  it("redacts multiple matching params", () => {
    const out = redactSearchParams("https://example.com/p?t=abc&u=xyz&keep=ok", [
      "t",
      "u",
    ]);
    expect(out).toContain("t=%5BREDACTED%5D");
    expect(out).toContain("u=%5BREDACTED%5D");
    expect(out).toContain("keep=ok");
    expect(out).not.toContain("abc");
    expect(out).not.toContain("xyz");
  });

  it("is a no-op when no listed param is present", () => {
    const input = "https://example.com/p?keep=ok";
    expect(redactSearchParams(input, ["t"])).toBe(input);
  });

  it("handles a relative URL with a redacted param", () => {
    const out = redactSearchParams("/listen/abc?t=xyz", ["t"]);
    expect(out).toBe("/listen/abc?t=%5BREDACTED%5D");
  });

  it("handles an absolute URL with path + redaction", () => {
    const out = redactSearchParams(
      "https://withjosephine.com/listen/sub-1?t=tok",
      ["t"],
    );
    expect(out).toBe(
      "https://withjosephine.com/listen/sub-1?t=%5BREDACTED%5D",
    );
  });

  it("returns input unchanged for a malformed URL", () => {
    const input = "not://a real url..::";
    expect(redactSearchParams(input, ["t"])).toBe(input);
  });

  it("returns input unchanged when paramsToRedact is empty", () => {
    const input = "https://example.com/p?t=abc";
    expect(redactSearchParams(input, [])).toBe(input);
  });

  it("redacts a param that has no value (?t=)", () => {
    const out = redactSearchParams("https://example.com/p?t=", ["t"]);
    expect(out).toBe("https://example.com/p?t=%5BREDACTED%5D");
  });

  it("redacts repeated occurrences of the same param", () => {
    const out = redactSearchParams("https://example.com/p?t=a&t=b", ["t"]);
    const matches = out.match(/%5BREDACTED%5D/g) ?? [];
    expect(matches.length).toBe(2);
    expect(out).not.toContain("t=a");
    expect(out).not.toContain("t=b");
  });

  it("preserves a plain fragment (no sensitive params in hash)", () => {
    const out = redactSearchParams("https://example.com/p?t=x#frag", ["t"]);
    expect(out).toContain("#frag");
    expect(out).toContain("t=%5BREDACTED%5D");
  });

  it("redacts sensitive params landing in the URL fragment", () => {
    const out = redactSearchParams("https://example.com/p#t=secret&keep=ok", ["t"]);
    expect(out).toContain("t=%5BREDACTED%5D");
    expect(out).toContain("keep=ok");
    expect(out).not.toContain("secret");
  });

  it("redacts sensitive params in BOTH query and fragment", () => {
    const out = redactSearchParams("https://example.com/p?t=q-secret#t=f-secret", ["t"]);
    const matches = out.match(/%5BREDACTED%5D/g) ?? [];
    expect(matches.length).toBe(2);
    expect(out).not.toContain("q-secret");
    expect(out).not.toContain("f-secret");
  });

  it("is a no-op on a fragment with no sensitive param", () => {
    const input = "https://example.com/p#section-2";
    expect(redactSearchParams(input, ["t"])).toBe(input);
  });

  it("redacts library one-tap tokens on /my-readings/welcome (Phase 2)", () => {
    const SENSITIVE_QUERY_PARAMS = ["t"] as const;
    const out = redactSearchParams(
      "https://withjosephine.com/my-readings/welcome?t=fakeToken.signedSig",
      SENSITIVE_QUERY_PARAMS,
    );
    expect(out).toBe(
      "https://withjosephine.com/my-readings/welcome?t=%5BREDACTED%5D",
    );
    expect(out).not.toContain("fakeToken.signedSig");
  });
});
