import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dbExec, dbQuery, type SqlValue } from "@/lib/booking/persistence/sqlClient";
import { captureConsole } from "@/test/captureConsole";
import { auditRows, giftWithSendToken, TEST_GIFT_INPUT } from "@/test/fixtures/gift";

vi.mock("@/lib/gift/giftRateLimit", () => ({
  checkGiftRateLimit: vi.fn(),
}));

import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";

const mockRateLimit = vi.mocked(checkGiftRateLimit);

const LAST_SENT_AT = "2026-10-03T09:30:00.000Z";

let capturedConsole: ReturnType<typeof captureConsole>;
let token: string;

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/gift/send/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.7" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function giftRow(giftId: string): Promise<Record<string, SqlValue>> {
  const [row] = await dbQuery<Record<string, SqlValue>>(`SELECT * FROM gift_codes WHERE id = ?`, [
    giftId,
  ]);
  return row;
}

beforeEach(() => {
  vi.stubEnv("GIFTS_ENABLED", "1");
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockRateLimit.mockReset().mockResolvedValue(true);
  capturedConsole = captureConsole();
  token = "";
});

afterEach(() => {
  if (token) expect(capturedConsole.text()).not.toContain(token);
  vi.restoreAllMocks();
});

describe("POST /api/gift/send/status guards", () => {
  it.each([undefined, "0"])("returns 404 Not Found when GIFTS_ENABLED is %s", async (flag) => {
    vi.stubEnv("GIFTS_ENABLED", flag);
    ({ token } = await giftWithSendToken("active"));
    const res = await callRoute({ token });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("returns 400 for a body without a token without a limiter call", async () => {
    const res = await callRoute({});
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(await auditRows()).toEqual([]);
  });

  it("answers invalid and writes an audit row without a submission id for a bad token", async () => {
    const res = await callRoute({ token: "not-a-token" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ state: "invalid" });
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(await auditRows()).toEqual([
      { event_type: "gift_send_link_invalid", success: 0, submission_id: null },
    ]);
  });

  it("returns 429 and writes no audit row when the limiter refuses a bad token", async () => {
    mockRateLimit.mockResolvedValueOnce(false);
    const res = await callRoute({ token: "not-a-token" });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
    expect(await auditRows()).toEqual([]);
  });
});

describe("POST /api/gift/send/status states", () => {
  it.each([
    ["pending", {}, { state: "invalid" }],
    ["expired", {}, { state: "invalid" }],
    ["cancelled", {}, { state: "invalid" }],
    ["redeemed", {}, { state: "opened" }],
    [
      "active",
      {},
      {
        state: "ready",
        buyerName: TEST_GIFT_INPUT.buyerFirstName,
        hasNote: true,
        recipientName: null,
      },
    ],
    [
      "active",
      { recipientName: "Anna" },
      {
        state: "ready",
        buyerName: TEST_GIFT_INPUT.buyerFirstName,
        hasNote: true,
        recipientName: "Anna",
      },
    ],
    [
      "active",
      { sendCount: 1, recipientName: "Anna", lastSentAt: LAST_SENT_AT },
      {
        state: "sent",
        buyerName: TEST_GIFT_INPUT.buyerFirstName,
        hasNote: true,
        recipientName: "Anna",
        lastSentAt: LAST_SENT_AT,
      },
    ],
    [
      "active",
      { sendCount: 2, recipientName: "Anna", lastSentAt: LAST_SENT_AT },
      { state: "used" },
    ],
  ] as const)("answers 200 for a %s gift with %o", async (status, row, expected) => {
    let giftId: string;
    ({ giftId, token } = await giftWithSendToken(status, row));
    const before = await giftRow(giftId);

    const res = await callRoute({ token });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expected);
    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(await giftRow(giftId)).toEqual(before);
    expect(await auditRows()).toEqual([]);
  });

  it("answers hasNote false for a gift without a note", async () => {
    ({ token } = await giftWithSendToken("active", {}, { note: null }));
    const res = await callRoute({ token });
    expect(await res.json()).toMatchObject({ state: "ready", hasNote: false });
  });

  it("answers invalid for a valid token whose gift row is gone", async () => {
    let giftId: string;
    ({ giftId, token } = await giftWithSendToken("active"));
    await dbExec(`DELETE FROM gift_codes WHERE id = ?`, [giftId]);
    const res = await callRoute({ token });
    expect(await res.json()).toEqual({ state: "invalid" });
    expect(mockRateLimit).not.toHaveBeenCalled();
  });
});
