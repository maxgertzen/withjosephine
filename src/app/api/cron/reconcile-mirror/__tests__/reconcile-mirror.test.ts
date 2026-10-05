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

vi.mock("@/lib/booking/submissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/submissions")>()),
  findGiftSubmissionInput: vi.fn(),
}));

vi.mock("@/lib/gift/redeemGift", () => ({
  remirrorRedeemedGift: vi.fn(async () => true),
}));

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn(async () => ({ fetch: mockSanityFetch })),
}));

vi.mock("@/lib/booking/persistence/sanityMirror", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/persistence/sanityMirror")>()),
  mirrorSubmissionPatch: vi.fn(async () => undefined),
  mirrorAppendEmailFired: vi.fn(async () => undefined),
}));

vi.mock("@/lib/gift/giftSubmissionMirror", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gift/giftSubmissionMirror")>()),
  writeGiftSubmission: vi.fn(async () => undefined),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { listSubmissionsCreatedAfter } from "@/lib/booking/persistence/repository";
import {
  mirrorAppendEmailFired,
  mirrorSubmissionPatch,
} from "@/lib/booking/persistence/sanityMirror";
import {
  type CreateSubmissionInput,
  findGiftSubmissionInput,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { listGiftsUpdatedAfter } from "@/lib/gift/gifts";
import { projectGiftSubmission, writeGiftSubmission } from "@/lib/gift/giftSubmissionMirror";
import { remirrorRedeemedGift } from "@/lib/gift/redeemGift";
import { makeGiftRecord, storedGiftSubmissionDoc } from "@/test/fixtures/gift";

import { POST } from "../route";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockListSubmissions = vi.mocked(listSubmissionsCreatedAfter);
const mockListGifts = vi.mocked(listGiftsUpdatedAfter);
const mockFindGiftSubmissionInput = vi.mocked(findGiftSubmissionInput);
const mockRemirror = vi.mocked(remirrorRedeemedGift);
const mockWriteGiftSubmission = vi.mocked(writeGiftSubmission);
const mockMirrorPatch = vi.mocked(mirrorSubmissionPatch);
const mockAppendEmailFired = vi.mocked(mirrorAppendEmailFired);

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
const NEVER_MIRRORED = paidGift({ id: "gift_never_mirrored", status: "active" });
const REDEEMED_ERASED = paidGift({
  id: "gift_erased",
  status: "redeemed",
  redeemedSubmissionId: "gift_erased",
  redeemedAt: "2026-10-04T08:00:00.000Z",
});
const REDEEMED_LEGACY = paidGift({
  id: "gift_legacy",
  status: "redeemed",
  redeemedSubmissionId: "sub_legacy",
  redeemedAt: "2026-10-04T08:00:00.000Z",
});

function storedGiftDoc(
  gift: typeof ACTIVE,
  overrides: Parameters<typeof storedGiftSubmissionDoc>[1] = {},
) {
  return storedGiftSubmissionDoc(projectGiftSubmission(gift, READING)!, overrides);
}

function sanityHolds(submissions: unknown[], giftDocs: unknown[]) {
  mockSanityFetch.mockImplementation(async (query: string) =>
    query.includes("gift{")
      ? giftDocs
      : query.includes('"reading"')
        ? { _id: READING._ref }
        : submissions,
  );
}

function cronRequest() {
  return new Request("https://withjosephine.com/api/cron/reconcile-mirror", { method: "POST" });
}

const SENT_CONFIRMATION = {
  type: "gift_recipient_confirmation" as const,
  sentAt: "2026-10-04T08:01:00.000Z",
  resendId: "msg_grc",
};

const GIFT_SUBMISSION: SubmissionRecord = {
  ...SUBMISSION,
  _id: "gift_redeemed",
  giftCodeId: "gift_redeemed",
  emailsFired: [SENT_CONFIRMATION],
};

const GIFT_SUBMISSION_INPUT: CreateSubmissionInput = {
  id: "gift_redeemed",
  email: "anna@example.com",
  status: "paid",
  readingSlug: "birth-chart",
  readingName: "Birth Chart Reading",
  readingPriceDisplay: "$89",
  responses: [],
  consentLabel: "art6 | art9 | cooling-off",
  photoR2Key: null,
  createdAt: "2026-10-04T08:00:00.000Z",
  coolingOffAcknowledgedAt: "2026-10-04T07:59:00.000Z",
  paidAt: "2026-10-04T08:00:00.000Z",
  recipientUserId: "user_anna",
  giftCodeId: "gift_redeemed",
};

beforeEach(() => {
  mockAuth.mockReset().mockReturnValue(true);
  mockListSubmissions.mockReset().mockResolvedValue([]);
  mockListGifts.mockReset().mockResolvedValue([]);
  mockFindGiftSubmissionInput.mockReset().mockResolvedValue(null);
  mockRemirror.mockReset().mockResolvedValue(true);
  mockAppendEmailFired.mockClear();
  mockSanityFetch.mockReset();
  mockWriteGiftSubmission.mockClear();
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
      recreated: 0,
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

  it.each([
    ["has no doc", []],
    [
      "has a doc without the email",
      [{ _id: "gift_redeemed", status: "gift_waiting", hasEmail: false }],
    ],
  ])("recreates a redeemed gift's submission that %s, from D1", async (_label, docs) => {
    mockListSubmissions.mockResolvedValue([GIFT_SUBMISSION]);
    mockFindGiftSubmissionInput.mockResolvedValue(GIFT_SUBMISSION_INPUT);
    sanityHolds(docs, []);

    const response = await POST(cronRequest());

    expect(await response.json()).toMatchObject({ recreated: 1, missing: 0, patched: 0 });
    expect(mockFindGiftSubmissionInput).toHaveBeenCalledWith("gift_redeemed", "gift_redeemed");
    expect(mockRemirror).toHaveBeenCalledWith(GIFT_SUBMISSION_INPUT, "gift_redeemed", null);
    expect(mockSanityFetch).toHaveBeenCalledWith(
      expect.stringContaining('"hasEmail": defined(email)'),
      {
        ids: ["gift_redeemed"],
      },
    );
  });

  it("carries the sent emails onto the recreated doc", async () => {
    mockListSubmissions.mockResolvedValue([GIFT_SUBMISSION]);
    mockFindGiftSubmissionInput.mockResolvedValue(GIFT_SUBMISSION_INPUT);
    sanityHolds([], []);

    await POST(cronRequest());

    expect(mockAppendEmailFired).toHaveBeenCalledWith("gift_redeemed", SENT_CONFIRMATION);
  });

  it("counts a recreate that wrote nothing as missing and patches nothing", async () => {
    mockListSubmissions.mockResolvedValue([GIFT_SUBMISSION]);
    mockFindGiftSubmissionInput.mockResolvedValue(GIFT_SUBMISSION_INPUT);
    mockRemirror.mockResolvedValue(false);
    sanityHolds([], []);

    const response = await POST(cronRequest());

    expect(await response.json()).toMatchObject({ recreated: 0, missing: 1 });
    expect(mockMirrorPatch).not.toHaveBeenCalled();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("counts a gift submission it cannot read back as missing", async () => {
    mockListSubmissions.mockResolvedValue([GIFT_SUBMISSION]);
    sanityHolds([], []);

    const response = await POST(cronRequest());

    expect(await response.json()).toMatchObject({ recreated: 0, missing: 1 });
    expect(mockRemirror).not.toHaveBeenCalled();
  });

  it("writes changed and missing unopened gift docs, skips equal ones and never writes a missing redeemed doc", async () => {
    mockListGifts.mockResolvedValue([
      ACTIVE,
      CANCELLED,
      NEVER_MIRRORED,
      REDEEMED_ERASED,
      REDEEMED_LEGACY,
    ]);
    sanityHolds(
      [],
      [
        storedGiftDoc(ACTIVE),
        storedGiftDoc(CANCELLED, { status: "gift_waiting" }),
        storedGiftDoc(REDEEMED_LEGACY, { gift: { hasNote: false, resendUsed: false } }),
      ],
    );

    const response = await POST(cronRequest());

    expect(await response.json()).toMatchObject({ giftsChecked: 5, giftsWritten: 3 });
    expect(mockWriteGiftSubmission.mock.calls.map(([, projection]) => projection.docId)).toEqual([
      "gift_cancelled",
      "gift_never_mirrored",
      "sub_legacy",
    ]);
    expect(mockSanityFetch).toHaveBeenCalledWith(expect.stringContaining('_type == "submission"'), {
      ids: ["gift_active", "gift_cancelled", "gift_never_mirrored", "gift_erased", "sub_legacy"],
    });
  });
});
