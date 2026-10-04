import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSanityFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/repository", () => ({
  listSubmissionsCreatedAfter: vi.fn(),
}));

vi.mock("@/lib/gift/gifts", () => ({
  listGiftsUpdatedAfter: vi.fn(),
}));

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn(async () => ({ fetch: mockSanityFetch })),
}));

vi.mock("@/lib/booking/persistence/sanityMirror", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/persistence/sanityMirror")>()),
  mirrorSubmissionPatch: vi.fn(async () => undefined),
  mirrorAppendEmailFired: vi.fn(async () => undefined),
}));

vi.mock("@/lib/gift/giftRecordMirror", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gift/giftRecordMirror")>()),
  mirrorGiftRecord: vi.fn(async () => undefined),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { listSubmissionsCreatedAfter } from "@/lib/booking/persistence/repository";
import { mirrorSubmissionPatch } from "@/lib/booking/persistence/sanityMirror";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { mirrorGiftRecord, projectGiftRecord } from "@/lib/gift/giftRecordMirror";
import { listGiftsUpdatedAfter } from "@/lib/gift/gifts";
import { makeGiftRecord } from "@/test/fixtures/gift";

import { POST } from "../route";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockListSubmissions = vi.mocked(listSubmissionsCreatedAfter);
const mockListGifts = vi.mocked(listGiftsUpdatedAfter);
const mockMirrorGiftRecord = vi.mocked(mirrorGiftRecord);
const mockMirrorPatch = vi.mocked(mirrorSubmissionPatch);

const READING = { _type: "reference" as const, _ref: "reading-birth-chart" };

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  email: "anna@example.com",
  status: "paid",
  responses: [],
  createdAt: "2026-10-03T08:00:00.000Z",
  paidAt: "2026-10-03T08:05:00.000Z",
  emailsFired: [],
  reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$89" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: null,
};

function paidGift(overrides: Parameters<typeof makeGiftRecord>[0]) {
  return makeGiftRecord({ activatedAt: "2026-10-03T08:05:00.000Z", ...overrides });
}

const ACTIVE = paidGift({ id: "gift_active", status: "active" });
const CANCELLED = paidGift({ id: "gift_cancelled", status: "cancelled" });
const MISSING = paidGift({
  id: "gift_missing",
  status: "redeemed",
  redeemedSubmissionId: "sub_1",
  redeemedAt: "2026-10-04T08:00:00.000Z",
});

function storedGift(gift: typeof ACTIVE, overrides: Record<string, unknown> = {}) {
  return { ...projectGiftRecord(gift, READING), ...overrides };
}

function sanityHolds(submissions: unknown[], gifts: unknown[]) {
  mockSanityFetch.mockImplementation(async (query: string) =>
    query.includes('"giftRecord"')
      ? gifts
      : query.includes('"reading"')
        ? { _id: READING._ref }
        : submissions,
  );
}

function cronRequest() {
  return new Request("https://withjosephine.com/api/cron/reconcile-mirror", { method: "POST" });
}

beforeEach(() => {
  mockAuth.mockReset().mockReturnValue(true);
  mockListSubmissions.mockReset().mockResolvedValue([]);
  mockListGifts.mockReset().mockResolvedValue([]);
  mockSanityFetch.mockReset();
  mockMirrorGiftRecord.mockClear();
  mockMirrorPatch.mockClear();
});

describe("POST /api/cron/reconcile-mirror", () => {
  it("answers 401 without auth and reads nothing", async () => {
    mockAuth.mockReturnValue(false);

    const response = await POST(cronRequest());

    expect(response.status).toBe(401);
    expect(mockListSubmissions).not.toHaveBeenCalled();
    expect(mockListGifts).not.toHaveBeenCalled();
  });

  it("reports zero for both passes when nothing changed in the window", async () => {
    const response = await POST(cronRequest());

    expect(await response.json()).toEqual({
      checked: 0,
      skipped: 0,
      patched: 0,
      missing: 0,
      giftsChecked: 0,
      giftsWritten: 0,
    });
    expect(mockSanityFetch).not.toHaveBeenCalled();
  });

  it("keeps the submission pass as before", async () => {
    mockListSubmissions.mockResolvedValue([SUBMISSION, { ...SUBMISSION, _id: "sub_2" }]);
    sanityHolds([{ _id: "sub_1", status: "pending" }], []);

    const response = await POST(cronRequest());

    expect(await response.json()).toMatchObject({ checked: 2, skipped: 0, patched: 1, missing: 1 });
    expect(mockMirrorPatch).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ status: "paid" }),
    );
  });

  it("writes a missing and a changed gift record and skips an equal one", async () => {
    mockListGifts.mockResolvedValue([ACTIVE, CANCELLED, MISSING]);
    sanityHolds([], [storedGift(ACTIVE), storedGift(CANCELLED, { status: "active" })]);

    const response = await POST(cronRequest());

    expect(await response.json()).toMatchObject({ giftsChecked: 3, giftsWritten: 2 });
    expect(mockMirrorGiftRecord.mock.calls).toEqual([["gift_cancelled"], ["gift_missing"]]);
    expect(mockSanityFetch).toHaveBeenCalledWith(expect.stringContaining('"giftRecord"'), {
      ids: ["gift_active", "gift_cancelled", "gift_missing"],
    });
  });
});
