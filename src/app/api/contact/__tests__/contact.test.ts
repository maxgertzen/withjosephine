import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerify = vi.mocked(verifyTurnstileToken);

const VALID_BODY = {
  name: "Jane Doe",
  email: "jane@example.com",
  message: "Hello there",
  turnstileToken: "valid-token",
};

beforeEach(() => {
  mockVerify.mockReset();
  vi.stubEnv("WEB3FORMS_KEY", "wf-key-123");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/contact", () => {
  it("returns 400 when JSON is invalid", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when honeypot is non-empty", async () => {
    const res = await callRoute({ ...VALID_BODY, botcheck: "spam" });
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when Turnstile verification fails", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(400);
  });

  it("returns 500 when Web3Forms access key is missing", async () => {
    vi.unstubAllEnvs();
    mockVerify.mockResolvedValueOnce(true);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(500);
  });

  it("forwards trimmed payload to Web3Forms with empty botcheck", async () => {
    mockVerify.mockResolvedValueOnce(true);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const res = await callRoute({
      name: "  Jane Doe  ",
      email: "  jane@example.com  ",
      message: "  Hello there  ",
      turnstileToken: "valid-token",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.web3forms.com/submit");
    expect(options?.method).toBe("POST");
    const forwarded = JSON.parse((options?.body as string) ?? "{}");
    expect(forwarded).toEqual({
      access_key: "wf-key-123",
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Hello there",
      subject: "New message from Jane Doe",
      botcheck: "",
    });
  });

  it("returns 502 when Web3Forms upstream fails", async () => {
    mockVerify.mockResolvedValueOnce(true);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );

    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
