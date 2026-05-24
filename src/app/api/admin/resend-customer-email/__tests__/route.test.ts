import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/resendCustomerEmail", () => ({
  resendCustomerEmail: vi.fn(),
  RESENDABLE_EMAIL_TYPES: ["order_confirmation", "day7"] as const,
}));

import { resendCustomerEmail } from "@/lib/booking/resendCustomerEmail";

const mockResend = vi.mocked(resendCustomerEmail);

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "super-secret-admin-token");
  mockResend.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(
  body: unknown,
  headers: Record<string, string> = { "x-admin-token": "super-secret-admin-token" },
): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/admin/resend-customer-email", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/resend-customer-email", () => {
  it("returns 404 with empty body when ADMIN_API_KEY env is missing", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const res = await callRoute({ submissionId: "sub_1", emailType: "order_confirmation" });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("returns 404 when the admin token is wrong", async () => {
    const res = await callRoute(
      { submissionId: "sub_1", emailType: "order_confirmation" },
      { "x-admin-token": "wrong-token" },
    );
    expect(res.status).toBe(404);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("returns 404 when submissionId is missing", async () => {
    const res = await callRoute({ emailType: "order_confirmation" });
    expect(res.status).toBe(404);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("returns 404 when emailType is not in the allowlist", async () => {
    const res = await callRoute({ submissionId: "sub_1", emailType: "evil_promo" });
    expect(res.status).toBe(404);
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("returns 200 with resend outcome on success", async () => {
    mockResend.mockResolvedValue({
      ok: true,
      emailType: "order_confirmation",
      targetEmailRedacted: "a***@example.com",
    });
    const res = await callRoute({ submissionId: "sub_1", emailType: "order_confirmation" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { outcome: string; to: string; emailType: string };
    expect(body.outcome).toBe("resent");
    expect(body.emailType).toBe("order_confirmation");
    expect(body.to).toBe("a***@example.com");
  });

  it("returns 409 with refusal reason when resend is rate-limited", async () => {
    mockResend.mockResolvedValue({ ok: false, reason: "rate_limited" });
    const res = await callRoute({ submissionId: "sub_1", emailType: "order_confirmation" });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { outcome: string; reason: string };
    expect(body.outcome).toBe("refused");
    expect(body.reason).toBe("rate_limited");
  });
});
