import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createOrReplace = vi.fn();
const deleteFn = vi.fn();

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: () => ({ createOrReplace, delete: deleteFn }),
}));

const SECRET = "test-webhook-secret";

beforeEach(() => {
  createOrReplace.mockReset().mockResolvedValue({});
  deleteFn.mockReset().mockResolvedValue({});
  vi.unstubAllEnvs();
  vi.stubEnv("SANITY_WEBHOOK_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function signBody(body: string, secret: string, timestamp = "1234567890"): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signed)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `t=${timestamp},v1=${sig}`;
}

async function callRoute(rawBody: string, signatureHeader?: string): Promise<Response> {
  const { POST } = await import("../route");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (signatureHeader !== undefined) headers.set("sanity-webhook-signature", signatureHeader);
  return POST(new Request("http://localhost/api/sanity-sync", { method: "POST", headers, body: rawBody }));
}

async function callWithValidSig(payload: unknown): Promise<Response> {
  const body = JSON.stringify(payload);
  const sig = await signBody(body, SECRET);
  return callRoute(body, sig);
}

describe("/api/sanity-sync", () => {
  it("returns 404 when SANITY_WEBHOOK_SECRET is not set (gates by env)", async () => {
    vi.stubEnv("SANITY_WEBHOOK_SECRET", "");
    const res = await callRoute(JSON.stringify({ _id: "x", _type: "reading", _operation: "create" }));
    expect(res.status).toBe(404);
    expect(createOrReplace).not.toHaveBeenCalled();
  });

  it("returns 401 when signature header is missing", async () => {
    const res = await callRoute(JSON.stringify({ _id: "x", _type: "reading", _operation: "create" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when HMAC signature does not match", async () => {
    const body = JSON.stringify({ _id: "x", _type: "reading", _operation: "create" });
    const sig = await signBody(body, "wrong-secret");
    const res = await callRoute(body, sig);
    expect(res.status).toBe(401);
    expect(createOrReplace).not.toHaveBeenCalled();
  });

  it("creates/replaces doc on _operation=create", async () => {
    const res = await callWithValidSig({
      _id: "reading-1",
      _type: "reading",
      _operation: "create",
      name: "Soul Blueprint",
    });
    expect(res.status).toBe(200);
    expect(createOrReplace).toHaveBeenCalledWith({
      _id: "reading-1",
      _type: "reading",
      name: "Soul Blueprint",
    });
  });

  it("creates/replaces on _operation=update", async () => {
    const res = await callWithValidSig({
      _id: "reading-1",
      _type: "reading",
      _operation: "update",
      name: "Updated",
    });
    expect(res.status).toBe(200);
    expect(createOrReplace).toHaveBeenCalledOnce();
  });

  it("strips the synthetic _operation field from the written doc", async () => {
    await callWithValidSig({
      _id: "reading-1",
      _type: "reading",
      _operation: "update",
      name: "Test",
    });
    const writtenDoc = createOrReplace.mock.calls[0]?.[0];
    expect(writtenDoc).not.toHaveProperty("_operation");
  });

  it("syncs draft documents (id with 'drafts.' prefix) so Presentation tool sees in-flight edits", async () => {
    const res = await callWithValidSig({
      _id: "drafts.reading-1",
      _type: "reading",
      _operation: "update",
      name: "Draft change",
    });
    expect(res.status).toBe(200);
    expect(createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "drafts.reading-1" }),
    );
  });

  it("deletes the doc on _operation=delete (no _type required)", async () => {
    const res = await callWithValidSig({
      _id: "reading-1",
      _operation: "delete",
    });
    expect(res.status).toBe(200);
    expect(deleteFn).toHaveBeenCalledWith("reading-1");
    expect(createOrReplace).not.toHaveBeenCalled();
  });

  it("returns 400 when _operation is missing (projection misconfigured)", async () => {
    const res = await callWithValidSig({
      _id: "reading-1",
      _type: "reading",
      name: "Test",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("delta::operation()");
  });

  it("returns 400 when _operation is invalid", async () => {
    const res = await callWithValidSig({
      _id: "reading-1",
      _type: "reading",
      _operation: "weird-op",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when _id is missing", async () => {
    const res = await callWithValidSig({
      _type: "reading",
      _operation: "create",
      name: "Anonymous",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body even with valid signature", async () => {
    const body = "not-json";
    const sig = await signBody(body, SECRET);
    const res = await callRoute(body, sig);
    expect(res.status).toBe(400);
    expect(createOrReplace).not.toHaveBeenCalled();
  });

  it("skips asset documents (sanity.imageAsset) — assets need a separate sync path", async () => {
    const res = await callWithValidSig({
      _id: "image-abc",
      _type: "sanity.imageAsset",
      _operation: "create",
      url: "https://...",
    });
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe("asset type");
    expect(createOrReplace).not.toHaveBeenCalled();
  });

  it("rejects payload missing _type for create/update (only delete allows missing _type)", async () => {
    const res = await callWithValidSig({
      _id: "reading-1",
      _operation: "create",
      name: "no type",
    });
    expect(res.status).toBe(400);
  });
});
