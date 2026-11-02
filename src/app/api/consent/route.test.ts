// @vitest-environment node
import { describe, expect, it } from "vitest";

import { consentCookie } from "@/lib/consentCookie";

import { POST } from "./route";

function send(body: string, headers: Record<string, string>) {
  return POST(
    new Request("https://withjosephine.com/api/consent", { method: "POST", body, headers }),
  );
}

describe("POST /api/consent", () => {
  it("sets the shared consent cookie from the server for a choice sent by one of our pages", async () => {
    const response = await send("granted", {
      host: "links.withjosephine.com",
      origin: "https://links.withjosephine.com",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toBe(consentCookie("granted"));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("accepts a choice sent from the main site to the main site", async () => {
    const response = await send("declined", {
      host: "withjosephine.com",
      origin: "https://www.withjosephine.com",
    });
    expect(response.headers.get("set-cookie")).toBe(consentCookie("declined"));
  });

  it("refuses a choice sent by another website", async () => {
    const response = await send("granted", {
      host: "withjosephine.com",
      origin: "https://example.com",
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a request with no origin, and staging, which keeps its own choice", async () => {
    expect((await send("granted", { host: "withjosephine.com" })).status).toBe(403);
    const staging = await send("granted", {
      host: "staging.withjosephine.com",
      origin: "https://staging.withjosephine.com",
    });
    expect(staging.status).toBe(403);
  });

  it("refuses a body longer than any choice before reading it", async () => {
    const response = await send("granted", {
      host: "withjosephine.com",
      origin: "https://withjosephine.com",
      "content-length": "5000000",
    });
    expect(response.status).toBe(413);
  });

  it("refuses anything that is not a choice", async () => {
    const response = await send("granted; Domain=evil.com", {
      host: "withjosephine.com",
      origin: "https://withjosephine.com",
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
