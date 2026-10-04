import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateOrReplace = vi.hoisted(() => vi.fn());
const mockDelete = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());
const mockFindGiftById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn(async () => ({
    createOrReplace: mockCreateOrReplace,
    delete: mockDelete,
    fetch: mockFetch,
  })),
}));

vi.mock("./persistence/repository", () => ({
  findGiftById: (id: string) => mockFindGiftById(id),
}));

import { clearReadingRefCache } from "@/lib/booking/persistence/sanityMirror";
import { makeGiftRecord } from "@/test/fixtures/gift";

import { mirrorGiftRecord, projectGiftRecord } from "./giftRecordMirror";

const GIFT_ID = "00000000-0000-4000-8000-000000000001";
const GOLDEN_CODE = "Y9EBDP599AM2";
const GOLDEN_LOOKUP_HASH = "6cdcc30e5a77b073295b0b0826e26809ea39f3c59e6b88f98a675f52bbba9270";
const GOLDEN_SEND_HMAC = "OwU0AOlEDqLGVapBH2VdxkO3IP8JCngREk8yoW6XZQI";
const READING_REF = { _type: "reference" as const, _ref: "reading-birth-chart" };

const ACTIVE_GIFT = makeGiftRecord({
  id: GIFT_ID,
  lookupHash: GOLDEN_LOOKUP_HASH,
  status: "active",
  buyerFirstName: "Dana",
  buyerEmail: "dana.buyer@example.com",
  note: "Happy birthday, a private note",
  consentLabel: "cooling-off waiver label",
  consentIpAddress: "198.51.100.23",
  stripeSessionId: "cs_test_a1B2c3",
  activatedAt: "2026-10-03T08:05:00.000Z",
  recipientName: "Rina Recipient",
  recipientEmail: "rina.recipient@example.com",
  sendCount: 2,
  lastSentAt: "2026-10-03T09:00:00.000Z",
});

const ALLOWED_KEYS = [
  "_id",
  "_type",
  "reading",
  "buyerFirstName",
  "status",
  "createdAt",
  "paidAt",
  "sentAt",
  "resendUsed",
  "openedAt",
  "hasNote",
  "submission",
];

beforeEach(() => {
  clearReadingRefCache();
  mockCreateOrReplace.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue(undefined);
  mockFetch.mockReset().mockResolvedValue({ _id: "reading-birth-chart" });
  mockFindGiftById.mockReset().mockResolvedValue(null);
});

describe("projectGiftRecord", () => {
  it("writes only the allowlisted keys and none of the private values", () => {
    const redeemed = projectGiftRecord(
      {
        ...ACTIVE_GIFT,
        status: "redeemed",
        redeemedSubmissionId: "sub_1",
        redeemedAt: "2026-10-04T10:00:00.000Z",
      },
      READING_REF,
    );

    expect(Object.keys(redeemed!).every((key) => ALLOWED_KEYS.includes(key))).toBe(true);
    const serialized = JSON.stringify(redeemed);
    for (const secret of [
      GOLDEN_CODE,
      GOLDEN_LOOKUP_HASH,
      GOLDEN_SEND_HMAC,
      ACTIVE_GIFT.note!,
      ACTIVE_GIFT.buyerEmail!,
      ACTIVE_GIFT.recipientName!,
      ACTIVE_GIFT.recipientEmail!,
      ACTIVE_GIFT.consentIpAddress!,
      ACTIVE_GIFT.consentLabel,
      "cs_",
    ]) {
      expect(serialized).not.toContain(secret);
    }
    expect(redeemed).toEqual({
      _id: GIFT_ID,
      _type: "giftRecord",
      reading: READING_REF,
      buyerFirstName: "Dana",
      status: "redeemed",
      createdAt: ACTIVE_GIFT.createdAt,
      paidAt: "2026-10-03T08:05:00.000Z",
      sentAt: "2026-10-03T09:00:00.000Z",
      resendUsed: true,
      openedAt: "2026-10-04T10:00:00.000Z",
      hasNote: true,
      submission: { _type: "reference", _ref: "sub_1", _weak: true },
    });
  });

  it("returns null for pending and expired gifts and projects a cancelled one", () => {
    expect(projectGiftRecord({ ...ACTIVE_GIFT, status: "pending" }, READING_REF)).toBeNull();
    expect(projectGiftRecord({ ...ACTIVE_GIFT, status: "expired" }, READING_REF)).toBeNull();
    expect(projectGiftRecord({ ...ACTIVE_GIFT, status: "cancelled" }, READING_REF)).toMatchObject({
      status: "cancelled",
    });
  });

  it("leaves out the reading, dates and submission it does not have", () => {
    const fresh = projectGiftRecord(
      { ...ACTIVE_GIFT, note: null, sendCount: 0, lastSentAt: null },
      null,
    );
    expect(fresh).not.toHaveProperty("reading");
    expect(fresh).not.toHaveProperty("submission");
    expect(fresh).toMatchObject({ resendUsed: false, hasNote: false, sentAt: undefined });
  });
});

describe("mirrorGiftRecord", () => {
  it("reads the row and creates or replaces the document for an active gift", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    await mirrorGiftRecord(GIFT_ID);

    expect(mockFindGiftById).toHaveBeenCalledWith(GIFT_ID);
    expect(mockCreateOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ _id: GIFT_ID, _type: "giftRecord", reading: READING_REF }),
      { visibility: "async" },
    );
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("keeps the stored document when the reading lookup fails", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    mockFetch.mockRejectedValue(new Error("sanity timeout"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await mirrorGiftRecord(GIFT_ID);

    expect(mockCreateOrReplace).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`write failed for ${GIFT_ID}`),
      expect.objectContaining({ message: expect.stringContaining("reading lookup failed") }),
    );
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it.each([
    ["the row is gone", null],
    ["the gift is pending", { ...ACTIVE_GIFT, status: "pending" as const }],
  ])("deletes the document when %s", async (_label, row) => {
    mockFindGiftById.mockResolvedValue(row);
    await mirrorGiftRecord(GIFT_ID);

    expect(mockDelete).toHaveBeenCalledWith(GIFT_ID);
    expect(mockCreateOrReplace).not.toHaveBeenCalled();
  });

  it("logs and swallows a Sanity failure", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    mockCreateOrReplace.mockRejectedValue(new Error("sanity down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(mirrorGiftRecord(GIFT_ID)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`write failed for ${GIFT_ID}`),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});
