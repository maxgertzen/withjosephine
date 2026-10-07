import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/gift/giftRateLimit", () => ({
  checkGiftRateLimit: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReadingPublished: vi.fn(),
}));

import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import { deriveGiftCode } from "@/lib/gift/giftCode";
import { formatGiftCode } from "@/lib/gift/giftCodeFormat";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { fetchReadingPublished } from "@/lib/sanity/fetch";
import type { SanityReading } from "@/lib/sanity/types";
import { captureConsole } from "@/test/captureConsole";
import { createTestGift, forceGiftStatus } from "@/test/fixtures/gift";

import { POST } from "../route";

const mockRateLimit = vi.mocked(checkGiftRateLimit);
const mockReading = vi.mocked(fetchReadingPublished);

async function check(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/gift/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function giftWithStatus(status: "active" | "redeemed" | "cancelled" | "pending") {
  const giftId = await createTestGift();
  if (status !== "pending") await forceGiftStatus(giftId, status);
  return deriveGiftCode(giftId);
}

async function invalidAuditCount(): Promise<number> {
  const rows = await dbQuery<{ total: number }>(
    `SELECT count(*) AS total FROM listen_audit WHERE event_type = 'gift_code_invalid' AND success = 0`,
  );
  return rows[0]?.total ?? 0;
}

let capturedConsole: ReturnType<typeof captureConsole>;

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockRateLimit.mockReset().mockResolvedValue(true);
  mockReading.mockReset().mockResolvedValue({ name: "Birth Chart Reading" } as SanityReading);
  capturedConsole = captureConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/gift/check", () => {
  it("answers 400 for a body without a code", async () => {
    const res = await check({ readingSlug: "birth-chart" });

    expect(res.status).toBe(400);
  });

  it.each(["active", "redeemed"] as const)(
    "answers valid with the undashed gift path for a %s code typed with dashes",
    async (status) => {
      const code = await giftWithStatus(status);

      const res = await check({ code: formatGiftCode(code).toLowerCase(), readingSlug: "birth-chart" });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ result: "valid", path: `/gift/${code}` });
    },
  );

  it("answers other_reading with the reading name and the gift path", async () => {
    const code = await giftWithStatus("active");

    const res = await check({ code, readingSlug: "soul-blueprint" });

    expect(await res.json()).toEqual({
      result: "other_reading",
      readingSlug: "birth-chart",
      readingName: "Birth Chart Reading",
      path: `/gift/${code}`,
    });
  });

  it("answers the same not_found for malformed, unknown, pending and cancelled codes", async () => {
    const pending = await giftWithStatus("pending");
    const cancelled = await giftWithStatus("cancelled");
    const bodies = await Promise.all(
      ["x", "AAAAAAAAAAAA", pending, cancelled].map(async (code) => {
        const res = await check({ code, readingSlug: "birth-chart" });
        return [res.status, await res.json()];
      }),
    );

    expect(bodies).toEqual(Array(4).fill([200, { result: "not_found" }]));
    expect(await invalidAuditCount()).toBe(4);
    expect(capturedConsole.text()).not.toContain(pending);
    expect(capturedConsole.text()).not.toContain(cancelled);
  });

  it("answers 429 rate_limited without a lookup when the limiter fails closed", async () => {
    mockRateLimit.mockResolvedValueOnce(false);

    const res = await check({ code: "AAAAAAAAAAAA", readingSlug: "birth-chart" });

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ result: "rate_limited" });
    expect(await invalidAuditCount()).toBe(0);
  });
});
