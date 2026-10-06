import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditRows, giftWithSendToken } from "@/test/fixtures/gift";

vi.mock("@/lib/gift/giftRateLimit", () => ({
  checkGiftRateLimit: vi.fn(),
}));

import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";

import { parseGiftSendStatusRequest } from "./giftSendContract";
import {
  authorizeGiftSendToken,
  type GiftSendRejection,
  rejectInvalidBody,
  rejectInvalidSendLink,
} from "./giftSendRequest";

const mockRateLimit = vi.mocked(checkGiftRateLimit);

const BAD_BODY_STATUS = 418;
const INVALID_LINK_STATUS = 410;

function request(body: unknown): Request {
  return new Request("http://localhost/api/gift/send/status", {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.7" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function rejection(status: number) {
  return vi.fn<GiftSendRejection>(async () => new Response(null, { status }));
}

function authorize(body: unknown) {
  const onBadBody = rejection(BAD_BODY_STATUS);
  const onInvalidLink = rejection(INVALID_LINK_STATUS);
  const result = authorizeGiftSendToken(request(body), parseGiftSendStatusRequest, {
    onBadBody,
    onInvalidLink,
  });
  return { result, onBadBody, onInvalidLink };
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockRateLimit.mockReset().mockResolvedValue(true);
});

describe("authorizeGiftSendToken", () => {
  it("returns the gift id and body for a valid token without a limiter call", async () => {
    const { giftId, token } = await giftWithSendToken("active");
    const { result, onBadBody, onInvalidLink } = authorize({ token });

    expect(await result).toEqual({ giftId, body: { token } });
    expect(onBadBody).not.toHaveBeenCalled();
    expect(onInvalidLink).not.toHaveBeenCalled();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it.each([
    ["a body that is not JSON", "{not json"],
    ["a body without a token", {}],
    ["a token that is not a string", { token: 42 }],
  ])("answers %s with onBadBody and leaves the limiter to it", async (_label, body) => {
    const { result, onBadBody, onInvalidLink } = authorize(body);

    expect(((await result) as Response).status).toBe(BAD_BODY_STATUS);
    expect(onBadBody).toHaveBeenCalledTimes(1);
    expect(onInvalidLink).not.toHaveBeenCalled();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("answers a token that does not verify with onInvalidLink", async () => {
    const { result, onBadBody, onInvalidLink } = authorize({ token: "not-a-token" });

    expect(((await result) as Response).status).toBe(INVALID_LINK_STATUS);
    expect(onInvalidLink).toHaveBeenCalledTimes(1);
    expect(onBadBody).not.toHaveBeenCalled();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("answers a real gift id with a wrong signature with onInvalidLink", async () => {
    const { giftId } = await giftWithSendToken("active");
    const { result, onInvalidLink } = authorize({ token: `${giftId}.AAAA` });

    expect(((await result) as Response).status).toBe(INVALID_LINK_STATUS);
    expect(onInvalidLink).toHaveBeenCalledTimes(1);
  });

  it("hands the rejection a limiter check on the request headers", async () => {
    mockRateLimit.mockResolvedValueOnce(false);
    const { result, onInvalidLink } = authorize({ token: "not-a-token" });
    await result;

    const [withinRateLimit] = onInvalidLink.mock.calls[0];
    expect(await withinRateLimit()).toBe(false);
    expect(mockRateLimit).toHaveBeenCalledTimes(1);
    expect(mockRateLimit.mock.calls[0][0].get("cf-connecting-ip")).toBe("203.0.113.7");
  });
});

describe("rejectInvalidBody", () => {
  it("answers 400 Invalid request body", async () => {
    const res = await rejectInvalidBody();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });
});

describe("rejectInvalidSendLink", () => {
  it.each([200, 404] as const)(
    "audits gift_send_link_invalid without a submission id and answers %i invalid",
    async (status) => {
      const res = await rejectInvalidSendLink(request({}), status)(async () => true);

      expect(res.status).toBe(status);
      expect(await res.json()).toEqual({ state: "invalid" });
      expect(await auditRows()).toEqual([
        { event_type: "gift_send_link_invalid", success: 0, submission_id: null },
      ]);
    },
  );

  it("answers 429 and writes no audit row when the limiter refuses", async () => {
    const res = await rejectInvalidSendLink(request({}), 404)(async () => false);

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
    expect(await auditRows()).toEqual([]);
  });
});
