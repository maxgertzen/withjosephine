import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteBrevoContact, deleteBrevoSmtpLog } from "./brevoDelete";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("BREVO_API_KEY", "brevo_key_test");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleteBrevoContact", () => {
  it("returns vendorNotConfigured when BREVO_API_KEY is absent", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    const result = await deleteBrevoContact("ada@example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("issues DELETE with api-key header and identifierType=email_id query", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await deleteBrevoContact("ada+1@example.com");

    expect(result).toEqual({ ok: true, trackingId: null });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://api.brevo.com/v3/contacts/ada%2B1%40example.com?identifierType=email_id",
    );
    expect(init.method).toBe("DELETE");
    expect(init.headers["api-key"]).toBe("brevo_key_test");
  });

  it("treats 404 as idempotent OK", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const result = await deleteBrevoContact("missing@example.com");
    expect(result).toEqual({ ok: true, trackingId: null });
  });

  it("returns ok=false on 4xx other than 404", async () => {
    fetchMock.mockResolvedValueOnce(new Response("forbidden", { status: 405 }));
    const result = await deleteBrevoContact("hello@withjosephine.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("HTTP 405");
  });
});

describe("deleteBrevoSmtpLog", () => {
  it("returns vendorNotConfigured when key is absent", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    const result = await deleteBrevoSmtpLog("ada@example.com");
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("captures process_id from a successful response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ process_id: 42 }), { status: 200 }),
    );
    const result = await deleteBrevoSmtpLog("ada@example.com");
    expect(result).toEqual({ ok: true, trackingId: "42" });
  });

  it("survives a 200 response without a process_id (treats as trackingId=null)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const result = await deleteBrevoSmtpLog("ada@example.com");
    expect(result).toEqual({ ok: true, trackingId: null });
  });

  it("treats 404 as idempotent OK", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const result = await deleteBrevoSmtpLog("ghost@example.com");
    expect(result).toEqual({ ok: true, trackingId: null });
  });
});
