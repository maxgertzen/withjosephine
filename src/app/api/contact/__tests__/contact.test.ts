import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendContactMessage: vi.fn(),
}));

import { sendContactMessage } from "@/lib/resend";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerify = vi.mocked(verifyTurnstileToken);
const mockSend = vi.mocked(sendContactMessage);

const VALID_BODY = {
  name: "Jane Doe",
  email: "jane@example.com",
  message: "Hello there",
  turnstileToken: "valid-token",
};

beforeEach(() => {
  mockVerify.mockReset();
  mockSend.mockReset().mockResolvedValue({ resendId: "msg_contact" });
});

afterEach(() => {
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
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 when Turnstile verification fails", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 500 when Resend returns null id (env or send misconfig)", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({ resendId: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(500);
  });

  it("returns 200 when Resend returns null id under RESEND_DRY_RUN (staging path)", async () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    mockVerify.mockResolvedValueOnce(true);
    mockSend.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    vi.unstubAllEnvs();
  });

  it("forwards trimmed payload to sendContactMessage", async () => {
    mockVerify.mockResolvedValueOnce(true);

    const res = await callRoute({
      name: "  Jane Doe  ",
      email: "  jane@example.com  ",
      message: "  Hello there  ",
      turnstileToken: "valid-token",
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockSend).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Hello there",
    });
  });

  it("returns 502 when Resend throws", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockSend.mockRejectedValueOnce(new Error("Resend down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
