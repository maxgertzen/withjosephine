import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindGiftById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn(async () => sanity.client),
}));

vi.mock("./persistence/repository", () => ({
  findGiftById: (id: string) => mockFindGiftById(id),
}));

import { clearReadingRefCache } from "@/lib/booking/persistence/sanityMirror";
import type { CreateSubmissionParams } from "@/lib/booking/submissions";
import { captureConsole } from "@/test/captureConsole";
import { makeGiftRecord, storedGiftSubmissionDoc } from "@/test/fixtures/gift";
import { recordingSanityClient } from "@/test/sanityRecordingClient";

import { deriveGiftCode, deriveGiftSendToken } from "./giftCode";
import {
  giftSubmissionDiffers,
  giftSubmissionDocId,
  mirrorGiftSubmission,
  projectGiftSubmission,
  writeGiftRedemption,
} from "./giftSubmissionMirror";
import type { GiftRecord } from "./types";

const sanity = recordingSanityClient();

const GIFT_ID = "00000000-0000-4000-8000-000000000001";
const READING_REF = { _type: "reference" as const, _ref: "reading-birth-chart" };
const ACTIVATED_AT = "2026-10-03T08:05:00.000Z";
const REDEEMED_AT = "2026-10-04T10:00:00.000Z";
const BY_ID = { query: "*[_id == $id]", params: { id: GIFT_ID } };

const ACTIVE_GIFT = makeGiftRecord({
  id: GIFT_ID,
  lookupHash: "6cdcc30e5a77b073295b0b0826e26809ea39f3c59e6b88f98a675f52bbba9270",
  status: "active",
  buyerFirstName: "Dana",
  buyerEmail: "dana.buyer@example.com",
  note: "Happy birthday, a private note",
  consentLabel: "cooling-off waiver label",
  consentIpAddress: "198.51.100.23",
  stripeSessionId: "cs_test_a1B2c3",
  activatedAt: ACTIVATED_AT,
  recipientName: "Rina Recipient",
  recipientEmail: "rina.recipient@example.com",
  sendCount: 2,
  lastSentAt: "2026-10-03T09:00:00.000Z",
});

const REDEEMED_GIFT: GiftRecord = {
  ...ACTIVE_GIFT,
  status: "redeemed",
  redeemedSubmissionId: GIFT_ID,
  redeemedAt: REDEEMED_AT,
};

const WAITING = projectGiftSubmission(ACTIVE_GIFT, READING_REF)!;
const REDEEMED = projectGiftSubmission(REDEEMED_GIFT, null)!;

const REDEMPTION: CreateSubmissionParams = {
  id: GIFT_ID,
  email: "anna@example.com",
  status: "paid",
  readingSlug: "birth-chart",
  readingName: "Birth Chart Reading",
  readingPriceDisplay: "$89",
  responses: [],
  consentLabel: "art6 | art9 | cooling-off",
  photoR2Key: null,
  createdAt: REDEEMED_AT,
  paidAt: REDEEMED_AT,
  recipientUserId: "user_anna",
  giftCodeId: GIFT_ID,
  giftRedeemEventId: "gift-redeem:nonce-1",
  consentAcknowledgedAt: REDEEMED_AT,
  ipAddress: "203.0.113.9",
  art6AcknowledgedAt: REDEEMED_AT,
  art9AcknowledgedAt: REDEEMED_AT,
  coolingOffAcknowledgedAt: REDEEMED_AT,
};

async function privateValues(gift: GiftRecord): Promise<string[]> {
  const sendToken = await deriveGiftSendToken(gift.id);
  return [
    await deriveGiftCode(gift.id),
    gift.lookupHash,
    sendToken,
    sendToken.split(".").at(-1)!,
    gift.note!,
    gift.buyerEmail!,
    gift.recipientName!,
    gift.recipientEmail!,
    gift.consentIpAddress!,
    gift.consentLabel,
    "cs_",
  ];
}

let capturedConsole: ReturnType<typeof captureConsole>;

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  clearReadingRefCache();
  sanity.reset();
  sanity.client.fetch.mockResolvedValue({ _id: "reading-birth-chart" });
  mockFindGiftById.mockReset().mockResolvedValue(null);
  capturedConsole = captureConsole();
});

describe("projectGiftSubmission", () => {
  it("projects an active gift as a gift_waiting submission keyed by the gift id", () => {
    expect(WAITING).toEqual({
      docId: GIFT_ID,
      unopened: { status: "gift_waiting", serviceRef: READING_REF, createdAt: ACTIVATED_AT },
      gift: {
        buyerFirstName: "Dana",
        boughtAt: ACTIVATED_AT,
        sentAt: "2026-10-03T09:00:00.000Z",
        resendUsed: true,
        openedAt: undefined,
        hasNote: true,
      },
    });
  });

  it("projects a cancelled gift as gift_cancelled", () => {
    expect(
      projectGiftSubmission({ ...ACTIVE_GIFT, status: "cancelled" }, READING_REF)?.unopened?.status,
    ).toBe("gift_cancelled");
  });

  it.each(["pending", "expired"] as const)("projects nothing for a %s gift", (status) => {
    expect(projectGiftSubmission({ ...ACTIVE_GIFT, status }, READING_REF)).toBeNull();
  });

  it("projects only the gift block for a redeemed gift", () => {
    expect(REDEEMED).toEqual({
      docId: GIFT_ID,
      unopened: null,
      gift: expect.objectContaining({ openedAt: REDEEMED_AT, hasNote: true }),
    });
  });

  it("leaves out an erased buyer name", () => {
    expect(
      projectGiftSubmission({ ...ACTIVE_GIFT, buyerFirstName: "" }, READING_REF)?.gift,
    ).not.toHaveProperty("buyerFirstName");
  });
});

describe("giftSubmissionDocId", () => {
  it("uses the gift id, or the submission a legacy redemption used", () => {
    expect(giftSubmissionDocId(ACTIVE_GIFT)).toBe(GIFT_ID);
    expect(giftSubmissionDocId({ ...REDEEMED_GIFT, redeemedSubmissionId: "sub_legacy" })).toBe(
      "sub_legacy",
    );
  });
});

describe("giftSubmissionDiffers", () => {
  it("is false for an equal doc", () => {
    expect(giftSubmissionDiffers(WAITING, storedGiftSubmissionDoc(WAITING))).toBe(false);
    expect(giftSubmissionDiffers(REDEEMED, storedGiftSubmissionDoc(REDEEMED))).toBe(false);
  });

  it("is true for a missing doc of an unopened gift, false for a missing redeemed doc", () => {
    expect(giftSubmissionDiffers(WAITING, null)).toBe(true);
    expect(giftSubmissionDiffers(REDEEMED, null)).toBe(false);
  });

  it.each([
    ["status", { status: "gift_cancelled" as const }],
    ["createdAt", { createdAt: "2026-10-01T00:00:00.000Z" }],
    ["serviceRef", { serviceRef: undefined }],
    ["gift.sentAt", { gift: { ...WAITING.gift, sentAt: "2026-10-03T09:30:00.000Z" } }],
    ["gift.buyerFirstName", { gift: { ...WAITING.gift, buyerFirstName: undefined } }],
  ])("is true when %s differs on an unopened gift", (_field, change) => {
    expect(giftSubmissionDiffers(WAITING, storedGiftSubmissionDoc(WAITING, change))).toBe(true);
  });

  it("ignores top-level fields on a redeemed gift and compares only its gift block", () => {
    expect(
      giftSubmissionDiffers(
        REDEEMED,
        storedGiftSubmissionDoc(REDEEMED, { status: "gift_waiting" }),
      ),
    ).toBe(false);
    expect(
      giftSubmissionDiffers(
        REDEEMED,
        storedGiftSubmissionDoc(REDEEMED, { gift: { ...REDEEMED.gift, openedAt: undefined } }),
      ),
    ).toBe(true);
  });
});

describe("mirrorGiftSubmission", () => {
  it("creates the gift_waiting doc if missing and patches it only while it has no email", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);

    await mirrorGiftSubmission(GIFT_ID);

    const fields = { ...WAITING.unopened, gift: WAITING.gift };
    expect(sanity.writes).toEqual([
      ["createIfNotExists", { _id: GIFT_ID, _type: "submission", ...fields }],
      [
        "patch",
        { query: "*[_id == $id && !defined(email)]", params: { id: GIFT_ID } },
        { set: fields },
      ],
    ]);
    expect(sanity.commit).toHaveBeenCalledWith({ visibility: "async" });
    expect(sanity.documents.get(GIFT_ID)).toMatchObject({
      status: "gift_waiting",
      createdAt: ACTIVATED_AT,
    });
  });

  it("moves an existing unopened doc to gift_cancelled", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    await mirrorGiftSubmission(GIFT_ID);
    mockFindGiftById.mockResolvedValue({ ...ACTIVE_GIFT, status: "cancelled" });

    await mirrorGiftSubmission(GIFT_ID);

    expect(sanity.documents.get(GIFT_ID)?.status).toBe("gift_cancelled");
  });

  it("never turns a redeemed doc back into an unopened gift when a stale projection lands late", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    await mirrorGiftSubmission(GIFT_ID);
    await writeGiftRedemption(REDEMPTION, REDEEMED_GIFT);

    await mirrorGiftSubmission(GIFT_ID);

    expect(sanity.documents.get(GIFT_ID)).toMatchObject({
      status: "paid",
      createdAt: REDEEMED_AT,
      email: "anna@example.com",
      gift: expect.objectContaining({ openedAt: REDEEMED_AT }),
    });
  });

  it("writes only the gift block on a redeemed gift's existing doc and never creates it", async () => {
    mockFindGiftById.mockResolvedValue(REDEEMED_GIFT);

    await mirrorGiftSubmission(GIFT_ID);

    expect(sanity.writes).toEqual([["patch", BY_ID, { set: { gift: REDEEMED.gift } }]]);
  });

  it("patches the legacy redemption's submission doc", async () => {
    mockFindGiftById.mockResolvedValue({ ...REDEEMED_GIFT, redeemedSubmissionId: "sub_legacy" });

    await mirrorGiftSubmission(GIFT_ID);

    expect(sanity.writes[0]?.[1]).toEqual({ query: "*[_id == $id]", params: { id: "sub_legacy" } });
  });

  it.each([
    ["the row is gone", null],
    ["the gift is pending", { ...ACTIVE_GIFT, status: "pending" as const }],
    ["the gift is expired", { ...ACTIVE_GIFT, status: "expired" as const }],
  ])("writes nothing when %s", async (_label, row) => {
    mockFindGiftById.mockResolvedValue(row);

    await mirrorGiftSubmission(GIFT_ID);

    expect(sanity.writes).toEqual([]);
  });

  it("keeps the stored doc when the reading lookup fails", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    sanity.client.fetch.mockRejectedValue(new Error("sanity timeout"));

    await mirrorGiftSubmission(GIFT_ID);

    expect(sanity.writes).toEqual([]);
    expect(capturedConsole.text()).toContain(`write failed for ${GIFT_ID}`);
    expect(capturedConsole.text()).toContain("reading lookup failed");
  });

  it("logs and swallows a Sanity failure", async () => {
    mockFindGiftById.mockResolvedValue(ACTIVE_GIFT);
    sanity.commit.mockRejectedValue(new Error("sanity down"));

    await expect(mirrorGiftSubmission(GIFT_ID)).resolves.toBeUndefined();
    expect(capturedConsole.text()).toContain(`write failed for ${GIFT_ID}`);
    expect(capturedConsole.text()).toContain("sanity down");
  });

  it.each([
    ["active", ACTIVE_GIFT],
    ["cancelled", { ...ACTIVE_GIFT, status: "cancelled" as const }],
    ["redeemed", REDEEMED_GIFT],
  ])("never sends Sanity a private value of a %s gift", async (_label, row) => {
    mockFindGiftById.mockResolvedValue(row);

    await mirrorGiftSubmission(GIFT_ID);

    const written = JSON.stringify(sanity.writes);
    for (const secret of await privateValues(row)) {
      expect(written).not.toContain(secret);
    }
    expect(written).toContain("Dana");
  });
});

describe("writeGiftRedemption", () => {
  it("creates a bare doc if missing, then in one patch keeps first writes and sets paid fields and the gift block", async () => {
    await writeGiftRedemption(REDEMPTION, REDEEMED_GIFT);

    expect(sanity.writes).toEqual([
      ["createIfNotExists", { _id: GIFT_ID, _type: "submission" }],
      [
        "patch",
        GIFT_ID,
        {
          setIfMissing: expect.objectContaining({
            serviceRef: READING_REF,
            email: "anna@example.com",
            responses: [],
            consentSnapshot: expect.objectContaining({ ipAddress: "203.0.113.9" }),
            recipientUserId: "user_anna",
          }),
          set: {
            status: "paid",
            createdAt: REDEEMED_AT,
            paidAt: REDEEMED_AT,
            gift: REDEEMED.gift,
          },
        },
      ],
    ]);
    expect(sanity.commit).toHaveBeenCalledOnce();
  });

  it("leaves the buyer name out when it was erased", async () => {
    await writeGiftRedemption(REDEMPTION, { ...REDEEMED_GIFT, buyerFirstName: "" });

    const [, , operations] = sanity.writes[1] as [string, unknown, { set: { gift: object } }];
    expect(operations.set.gift).not.toHaveProperty("buyerFirstName");
  });

  it("never sends Sanity a private value of the gift or the redeem event id", async () => {
    await writeGiftRedemption(REDEMPTION, REDEEMED_GIFT);

    const written = JSON.stringify(sanity.writes);
    for (const secret of [...(await privateValues(REDEEMED_GIFT)), "gift-redeem:"]) {
      expect(written).not.toContain(secret);
    }
  });

  it("logs and swallows a Sanity failure", async () => {
    sanity.commit.mockRejectedValue(new Error("sanity down"));

    await expect(writeGiftRedemption(REDEMPTION, REDEEMED_GIFT)).resolves.toBe(false);
    expect(capturedConsole.text()).toContain(`write failed for ${GIFT_ID}`);
  });

  it("reports a committed write", async () => {
    await expect(writeGiftRedemption(REDEMPTION, REDEEMED_GIFT)).resolves.toBe(true);
  });
});
