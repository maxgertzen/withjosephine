import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

const SECRET = "test-revalidate-secret";

beforeEach(() => {
  revalidateTag.mockReset();
  vi.unstubAllEnvs();
  vi.stubEnv("SANITY_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function signBody(body: string, secret: string, timestamp?: string): Promise<string> {
  const ts = timestamp ?? String(Date.now());
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${body}`));
  const sig = btoa(String.fromCharCode(...new Uint8Array(signed)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `t=${ts},v1=${sig}`;
}

async function callRoute(rawBody: string, signatureHeader?: string): Promise<Response> {
  const { POST } = await import("../route");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (signatureHeader !== undefined) headers.set("sanity-webhook-signature", signatureHeader);
  return POST(
    new Request("http://localhost/api/sanity-revalidate", {
      method: "POST",
      headers,
      body: rawBody,
    }),
  );
}

describe("/api/sanity-revalidate", () => {
  it("returns 404 when SANITY_WEBHOOK_SECRET is unset", async () => {
    vi.stubEnv("SANITY_WEBHOOK_SECRET", "");
    const res = await callRoute(JSON.stringify({ _id: "x" }));
    expect(res.status).toBe(404);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 401 when the signature header is missing", async () => {
    const res = await callRoute(JSON.stringify({ _id: "x" }));
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 401 on an invalid signature", async () => {
    const res = await callRoute(JSON.stringify({ _id: "x" }), "t=123,v1=bogus");
    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates the shared content tag on a valid signature", async () => {
    const body = JSON.stringify({ _id: "x", _type: "reading" });
    const res = await callRoute(body, await signBody(body, SECRET));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith("sanity:content", "max");
  });
});
