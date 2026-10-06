import { createHmac, randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/cloudflare", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/booking/resendWebhook", () => ({
  handleResendWebhookEvent: vi.fn(),
}));

import * as Sentry from "@sentry/cloudflare";

import { handleResendWebhookEvent } from "@/lib/booking/resendWebhook";

const mockHandle = vi.mocked(handleResendWebhookEvent);

const SECRET_BYTES = randomBytes(24);
const WEBHOOK_SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;

const BOUNCE_EVENT = {
  type: "email.bounced",
  created_at: "2026-10-04T12:00:05.000Z",
  data: {
    created_at: "2026-10-04T12:00:00.000Z",
    email_id: "msg_1",
    from: "Josephine <hello@withjosephine.com>",
    to: ["ada@exmaple.com"],
    subject: "Your reading",
    tags: { submission_id: "sub_1", email_type: "reading_delivery" },
    bounce: { type: "Permanent", subType: "General", message: "Mailbox does not exist" },
  },
};

function signedRequest(body: string, signWith = SECRET_BYTES): Request {
  const id = "msg_svix_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", signWith).update(`${id}.${timestamp}.${body}`).digest("base64");
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    headers: {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
    },
    body,
  });
}

async function post(request: Request): Promise<Response> {
  const { POST } = await import("../route");
  return POST(request);
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("RESEND_WEBHOOK_SECRET", WEBHOOK_SECRET);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockHandle.mockReset().mockResolvedValue("recorded");
  vi.mocked(Sentry.captureException).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/webhooks/resend", () => {
  it("returns 404 when the webhook secret is not set", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");

    expect((await post(signedRequest(JSON.stringify(BOUNCE_EVENT)))).status).toBe(404);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it("rejects a body signed with another secret", async () => {
    const res = await post(signedRequest(JSON.stringify(BOUNCE_EVENT), randomBytes(24)));

    expect(res.status).toBe(400);
    expect(mockHandle).not.toHaveBeenCalled();
  });

  it("rejects a body changed after signing", async () => {
    const request = signedRequest(JSON.stringify(BOUNCE_EVENT));
    const tampered = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ ...BOUNCE_EVENT, type: "email.complained" }),
    });

    expect((await post(tampered)).status).toBe(400);
  });

  it("hands a verified event to the handler and returns its outcome", async () => {
    const res = await post(signedRequest(JSON.stringify(BOUNCE_EVENT)));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "recorded" });
    expect(mockHandle).toHaveBeenCalledWith(BOUNCE_EVENT);
  });

  it("answers 200 and reports to Sentry when handling a verified event fails", async () => {
    mockHandle.mockRejectedValueOnce(new Error("D1 down"));

    const res = await post(signedRequest(JSON.stringify(BOUNCE_EVENT)));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "error" });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
