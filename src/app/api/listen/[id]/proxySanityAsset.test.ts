import { describe, expect, it } from "vitest";

import { forwardRangeHeader, isFirstByteRequest, proxySanityAsset } from "./proxySanityAsset";

describe("proxySanityAsset", () => {
  it("forwards body + status + range headers but strips provenance", () => {
    const upstream = new Response("some bytes", {
      status: 206,
      statusText: "Partial Content",
      headers: {
        "content-type": "audio/mpeg",
        "content-length": "10",
        "content-range": "bytes 0-9/100",
        "accept-ranges": "bytes",
        server: "Sanity-CDN/1.2",
        "x-served-by": "fastly-edge-iad",
      },
    });
    const proxied = proxySanityAsset(upstream, { contentDisposition: "inline" });
    expect(proxied.status).toBe(206);
    expect(proxied.headers.get("content-type")).toBe("audio/mpeg");
    expect(proxied.headers.get("content-range")).toBe("bytes 0-9/100");
    expect(proxied.headers.get("accept-ranges")).toBe("bytes");
    expect(proxied.headers.get("content-disposition")).toBe("inline");
    expect(proxied.headers.get("server")).toBeNull();
    expect(proxied.headers.get("x-served-by")).toBeNull();
  });

  it("isFirstByteRequest detects opener Range patterns", () => {
    expect(isFirstByteRequest(new Request("https://x"))).toBe(true);
    expect(isFirstByteRequest(new Request("https://x", { headers: { range: "bytes=0-" } }))).toBe(
      true,
    );
    expect(
      isFirstByteRequest(new Request("https://x", { headers: { range: "bytes=100-200" } })),
    ).toBe(false);
    expect(
      isFirstByteRequest(new Request("https://x", { headers: { range: "bytes=0-99" } })),
    ).toBe(false);
  });

  it("forwardRangeHeader copies Range when present, blank when not", () => {
    const withRange = new Request("https://example.com", {
      headers: { range: "bytes=0-99" },
    });
    expect(forwardRangeHeader(withRange).get("range")).toBe("bytes=0-99");
    const withoutRange = new Request("https://example.com");
    expect(forwardRangeHeader(withoutRange).get("range")).toBeNull();
  });
});
