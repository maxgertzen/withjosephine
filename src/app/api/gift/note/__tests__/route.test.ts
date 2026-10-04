import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GIFT_BUYER_NAME_MAX_CHARS, GIFT_NOTE_MAX_CHARS } from "@/lib/booking/constants";
import { dbBatch } from "@/lib/booking/persistence/sqlClient";
import { captureConsole } from "@/test/captureConsole";
import { createTestGift, forceGiftStatus, TEST_GIFT_INPUT } from "@/test/fixtures/gift";

vi.mock("@/lib/gift/giftRateLimit", () => ({
  checkGiftRateLimit: vi.fn(),
}));

import { deriveGiftSendToken } from "@/lib/gift/giftCode";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { buildRedeemGiftStatement, findGiftById } from "@/lib/gift/gifts";

const mockRateLimit = vi.mocked(checkGiftRateLimit);

const NEW_NAME = "Dana";
const NEW_NOTE = "Happy birthday, Anna.";

let capturedConsole: ReturnType<typeof captureConsole>;
let token: string;

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/gift/note", {
      method: "POST",
      headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.7" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function activeGiftToken(): Promise<{ giftId: string; token: string }> {
  const giftId = await createTestGift();
  await forceGiftStatus(giftId, "active");
  return { giftId, token: await deriveGiftSendToken(giftId) };
}

beforeEach(() => {
  vi.stubEnv("GIFTS_ENABLED", "1");
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockRateLimit.mockReset().mockResolvedValue(true);
  capturedConsole = captureConsole();
  token = "";
});

afterEach(() => {
  const logs = capturedConsole.text();
  expect(logs).not.toMatch(/cs_/);
  expect(logs).not.toContain(NEW_NOTE);
  expect(logs).not.toContain(TEST_GIFT_INPUT.note);
  if (token) expect(logs).not.toContain(token);
  vi.restoreAllMocks();
});

describe("POST /api/gift/note guards", () => {
  it.each([undefined, "0"])("returns 404 Not Found when GIFTS_ENABLED is %s", async (flag) => {
    vi.stubEnv("GIFTS_ENABLED", flag);
    ({ token } = await activeGiftToken());
    const res = await callRoute({ token, buyerFirstName: NEW_NAME, note: NEW_NOTE });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("Not Found");
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("returns 404 with an empty body and one limiter call for a bad token", async () => {
    const res = await callRoute({ token: "not-a-token", buyerFirstName: NEW_NAME, note: NEW_NOTE });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
  });

  it("returns 404 and counts the attempt for a body that is not JSON", async () => {
    const res = await callRoute("{not json");
    expect(res.status).toBe(404);
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
  });

  it("returns 404 and stores nothing for a real gift id with a wrong signature", async () => {
    const { giftId } = await activeGiftToken();
    const res = await callRoute({
      token: `${giftId}.AAAA`,
      buyerFirstName: NEW_NAME,
      note: NEW_NOTE,
    });
    expect(res.status).toBe(404);
    expect((await findGiftById(giftId))?.note).toBe(TEST_GIFT_INPUT.note);
  });

  it("returns 429 with an empty body when the limiter refuses a bad token", async () => {
    mockRateLimit.mockResolvedValueOnce(false);
    const res = await callRoute({ token: "not-a-token", buyerFirstName: NEW_NAME, note: NEW_NOTE });
    expect(res.status).toBe(429);
    expect(await res.text()).toBe("");
  });
});

describe("POST /api/gift/note fields", () => {
  it("saves the name and note for an active gift without a limiter call", async () => {
    let giftId: string;
    ({ giftId, token } = await activeGiftToken());
    const res = await callRoute({ token, buyerFirstName: ` ${NEW_NAME} `, note: ` ${NEW_NOTE} ` });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockRateLimit).not.toHaveBeenCalled();
    expect(await findGiftById(giftId)).toMatchObject({ buyerFirstName: NEW_NAME, note: NEW_NOTE });
  });

  it("strips {...} tags from the name and the note", async () => {
    let giftId: string;
    ({ giftId, token } = await activeGiftToken());
    const res = await callRoute({
      token,
      buyerFirstName: "Da{code}na",
      note: "See {giftUrl}you soon",
    });
    expect(res.status).toBe(200);
    expect(await findGiftById(giftId)).toMatchObject({
      buyerFirstName: "Dana",
      note: "See you soon",
    });
  });

  it("stores an empty note as NULL", async () => {
    let giftId: string;
    ({ giftId, token } = await activeGiftToken());
    const res = await callRoute({ token, buyerFirstName: NEW_NAME, note: "  {code} " });
    expect(res.status).toBe(200);
    expect((await findGiftById(giftId))?.note).toBeNull();
  });

  it.each([
    ["an empty name", { buyerFirstName: " {x} ", note: NEW_NOTE }],
    [
      "a name over the limit",
      { buyerFirstName: "a".repeat(GIFT_BUYER_NAME_MAX_CHARS + 1), note: "" },
    ],
    [
      "a note over the limit",
      { buyerFirstName: NEW_NAME, note: "a".repeat(GIFT_NOTE_MAX_CHARS + 1) },
    ],
  ])("returns 400 for %s and stores nothing", async (_label, fields) => {
    let giftId: string;
    ({ giftId, token } = await activeGiftToken());
    const res = await callRoute({ token, ...fields });
    expect(res.status).toBe(400);
    expect(await findGiftById(giftId)).toMatchObject({
      buyerFirstName: TEST_GIFT_INPUT.buyerFirstName,
      note: TEST_GIFT_INPUT.note,
    });
  });

  it("accepts values at the limit once the tags are stripped", async () => {
    ({ token } = await activeGiftToken());
    const res = await callRoute({
      token,
      buyerFirstName: `${"a".repeat(GIFT_BUYER_NAME_MAX_CHARS)}{reading}`,
      note: `${"b".repeat(GIFT_NOTE_MAX_CHARS)}{code}`,
    });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/gift/note on a gift that is no longer active", () => {
  it.each(["redeemed", "cancelled"] as const)(
    "returns 409 not_active for a %s gift and stores nothing",
    async (status) => {
      let giftId: string;
      ({ giftId, token } = await activeGiftToken());
      await forceGiftStatus(giftId, status);
      const res = await callRoute({ token, buyerFirstName: NEW_NAME, note: NEW_NOTE });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: "not_active" });
      expect(await findGiftById(giftId)).toMatchObject({
        buyerFirstName: TEST_GIFT_INPUT.buyerFirstName,
        note: TEST_GIFT_INPUT.note,
      });
    },
  );

  it("leaves the note NULL when a save races a redemption", async () => {
    let giftId: string;
    ({ giftId, token } = await activeGiftToken());
    const redeemedAt = new Date().toISOString();

    const [res] = await Promise.all([
      callRoute({ token, buyerFirstName: NEW_NAME, note: NEW_NOTE }),
      dbBatch([
        buildRedeemGiftStatement({
          giftId,
          readingSlug: TEST_GIFT_INPUT.readingSlug,
          submissionId: "sub_redeemed",
          redeemedAt,
        }),
      ]),
    ]);

    expect([200, 409]).toContain(res.status);
    expect(await findGiftById(giftId)).toMatchObject({ status: "redeemed", note: null });
  });
});
