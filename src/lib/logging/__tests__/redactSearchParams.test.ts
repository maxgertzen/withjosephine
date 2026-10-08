import { describe, expect, it } from "vitest";

import {
  redactSearchParams,
  redactSensitiveUrl,
  scrubBreadcrumb,
  scrubSentryRequest,
} from "../redactSearchParams";

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

describe("redactSensitiveUrl", () => {
  it.each([
    ["https://withjosephine.com/gift/K7M2QX9PH4TR", "https://withjosephine.com/gift/[REDACTED]"],
    [
      "https://withjosephine.com/gift/send#00000000-0000-4000-8000-000000000001.OwU0AOlEDqLGVapBH2VdxkO3IP8JCngREk8yoW6XZQI",
      "https://withjosephine.com/gift/send#[REDACTED]",
    ],
    ["/thank-you/birth-chart?sessionId=cs_live_x", "/thank-you/birth-chart?sessionId=%5BREDACTED%5D"],
    [
      "/thank-you/birth-chart?submissionId=8f1c2d3e-0000-4000-8000-000000000000",
      "/thank-you/birth-chart?submissionId=%5BREDACTED%5D",
    ],
    ["/listen/abc?t=tok", "/listen/[REDACTED]?t=%5BREDACTED%5D"],
  ])("redacts %s", (input, expected) => {
    expect(redactSensitiveUrl(input)).toBe(expected);
  });

  it("keeps the /gift/send path readable", () => {
    expect(redactSensitiveUrl("https://withjosephine.com/gift/send")).toBe(
      "https://withjosephine.com/gift/send",
    );
    expect(redactSensitiveUrl("/gift/send?ref=email")).toBe("/gift/send?ref=email");
  });

  it("redacts a gift code that starts with send", () => {
    expect(redactSensitiveUrl("/gift/SENDABC12345")).toBe("/gift/[REDACTED]");
    expect(redactSensitiveUrl("/gift/sendx")).toBe("/gift/[REDACTED]");
  });

  it("returns a URL with nothing sensitive unchanged", () => {
    const input = "https://withjosephine.com/book/birth-chart?utm_source=tiktok#faq";
    expect(redactSensitiveUrl(input)).toBe(input);
  });
});

describe("scrubBreadcrumb", () => {
  it("redacts url, from and to in breadcrumb data", () => {
    const breadcrumb = {
      category: "navigation",
      data: {
        from: "/gift/send#00000000-0000-4000-8000-000000000001.mac",
        to: "/gift/K7M2QX9PH4TR",
        url: "https://withjosephine.com/thank-you/birth-chart?sessionId=cs_live_x",
        method: "GET",
      },
    };
    expect(scrubBreadcrumb(breadcrumb)).toEqual({
      category: "navigation",
      data: {
        from: "/gift/send#[REDACTED]",
        to: "/gift/[REDACTED]",
        url: "https://withjosephine.com/thank-you/birth-chart?sessionId=%5BREDACTED%5D",
        method: "GET",
      },
    });
  });

  it("leaves non-string values and breadcrumbs without data alone", () => {
    const noData: { category: string; message: string; data?: Record<string, unknown> } = {
      category: "console",
      message: "hello",
    };
    expect(scrubBreadcrumb(noData)).toEqual({ category: "console", message: "hello" });
    const numeric = { data: { url: 42, status_code: 200 } };
    expect(scrubBreadcrumb(numeric)).toEqual({ data: { url: 42, status_code: 200 } });
  });
});

describe("scrubSentryRequest", () => {
  it("drops sensitive headers in any case and redacts the url", () => {
    const request = {
      headers: {
        Cookie: "c",
        authorization: "Bearer x",
        Referer: "https://withjosephine.com/gift/K7M2QX9PH4TR",
        "user-agent": "ua",
      },
      url: "https://withjosephine.com/thank-you/birth-chart?sessionId=cs_live_x",
    };
    scrubSentryRequest(request);
    expect(request).toEqual({
      headers: { "user-agent": "ua" },
      url: "https://withjosephine.com/thank-you/birth-chart?sessionId=%5BREDACTED%5D",
    });
  });

  it("redacts a string query_string and drops the body and other query_string forms", () => {
    const withString = { query_string: "sessionId=cs_live_x&ref=a", data: { email: "a@b.c" } };
    scrubSentryRequest(withString);
    expect(withString).toEqual({ query_string: "ref=a&sessionId=%5BREDACTED%5D" });
    const clean = { query_string: "ref=a" };
    scrubSentryRequest(clean);
    expect(clean).toEqual({ query_string: "ref=a" });
    const withObject: { query_string?: unknown } = { query_string: { t: "tok" } };
    scrubSentryRequest(withObject);
    expect(withObject).toEqual({});
  });

  it("accepts a missing request", () => {
    expect(() => scrubSentryRequest(undefined)).not.toThrow();
  });
});

describe("redactSensitiveUrl without sensitive params", () => {
  it.each(["/api/gift/purchase", "/api/gift/check", "/api/gift/send/status"])(
    "leaves the gift API route %s readable",
    (path) => {
      expect(redactSensitiveUrl(path)).toBe(path);
    },
  );

  it("returns a long query URL unchanged", () => {
    const sanityUrl = "https://x.api.sanity.io/v1/data/query/production?query=*%5B_type%3D%3D%22reading%22%5D&limit=10";
    expect(redactSensitiveUrl(sanityUrl)).toBe(sanityUrl);
  });

  it("still redacts a bare t param with no value", () => {
    expect(redactSensitiveUrl("/listen/abc?t")).toBe(redactSearchParams("/listen/[REDACTED]?t", ["t"]));
  });
});
