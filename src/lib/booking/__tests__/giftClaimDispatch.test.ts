import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/giftClaim", () => ({
  issueGiftClaimToken: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: vi.fn(),
    markGiftClaimSent: vi.fn(),
    appendEmailFired: vi.fn(),
  };
});

vi.mock("@/lib/resend", () => ({
  sendGiftClaimEmail: vi.fn(),
}));

import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import {
  appendEmailFired,
  findSubmissionById,
  markGiftClaimSent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendGiftClaimEmail } from "@/lib/resend";

import { dispatchGiftClaim } from "../giftClaimDispatch";

const mockFind = vi.mocked(findSubmissionById);
const mockMark = vi.mocked(markGiftClaimSent);
const mockAppend = vi.mocked(appendEmailFired);
const mockIssue = vi.mocked(issueGiftClaimToken);
const mockSend = vi.mocked(sendGiftClaimEmail);

const BASE_SUBMISSION: SubmissionRecord = {
  _id: "sub_gift",
  status: "paid",
  email: "purchaser@example.com",
  responses: [
    { fieldKey: "recipient_name", fieldLabelSnapshot: "", fieldType: "text", value: "Mira" },
    { fieldKey: "purchaser_first_name", fieldLabelSnapshot: "", fieldType: "text", value: "Lior" },
  ],
  createdAt: "2026-05-01T00:00:00.000Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: 17900,
  amountPaidCurrency: "usd",
  recipientUserId: null,
  isGift: true,
  purchaserUserId: "user_purchaser",
  recipientEmail: "recipient@example.com",
  giftDeliveryMethod: "scheduled",
  giftSendAt: "2026-06-01T15:00:00.000Z",
  giftMessage: "happy birthday",
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: null,
  giftCancelledAt: null,
};

const NOW_MS = Date.parse("2026-06-01T15:00:00.000Z");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  mockFind.mockReset();
  mockMark.mockReset().mockResolvedValue(undefined);
  mockAppend.mockReset().mockResolvedValue(undefined);
  mockIssue.mockReset().mockResolvedValue({
    token: "a".repeat(64),
    tokenHash: "b".repeat(64),
    claimUrl: "https://withjosephine.com/gift/claim?token=" + "a".repeat(64),
  });
  mockSend.mockReset().mockResolvedValue({ resendId: "msg_gift_claim_1" });
});

describe("dispatchGiftClaim — stop branches", () => {
  it("stops with reason=missing when submission not found", async () => {
    mockFind.mockResolvedValueOnce(null);
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result).toEqual({ outcome: "stop", reason: "missing", nextAlarmMs: null });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("stops with reason=claimed when gift_claimed_at is set", async () => {
    mockFind.mockResolvedValueOnce({ ...BASE_SUBMISSION, giftClaimedAt: NOW_MS.toString() });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("stop");
    if (result.outcome === "stop") expect(result.reason).toBe("claimed");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("stops with reason=cancelled when gift_cancelled_at is set", async () => {
    mockFind.mockResolvedValueOnce({
      ...BASE_SUBMISSION,
      giftCancelledAt: "2026-05-30T00:00:00.000Z",
    });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("stop");
    if (result.outcome === "stop") expect(result.reason).toBe("cancelled");
  });

  it("stops with reason=abandoned when 30d+ since first send and unclaimed", async () => {
    mockFind.mockResolvedValueOnce({
      ...BASE_SUBMISSION,
      giftClaimEmailFiredAt: new Date(NOW_MS - THIRTY_DAYS_MS - 1).toISOString(),
    });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 1,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("stop");
    if (result.outcome === "stop") expect(result.reason).toBe("abandoned");
  });

  it("stops with reason=max_retries when retryCount >= 3", async () => {
    mockFind.mockResolvedValueOnce({
      ...BASE_SUBMISSION,
      giftClaimEmailFiredAt: new Date(NOW_MS - SEVEN_DAYS_MS).toISOString(),
    });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 3,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("stop");
    if (result.outcome === "stop") expect(result.reason).toBe("max_retries");
  });

  it("stops with reason=not_scheduled when delivery method is self_send", async () => {
    mockFind.mockResolvedValueOnce({ ...BASE_SUBMISSION, giftDeliveryMethod: "self_send" });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("stop");
    if (result.outcome === "stop") expect(result.reason).toBe("not_scheduled");
  });

  it("stops with reason=missing when recipient_email is null", async () => {
    mockFind.mockResolvedValueOnce({ ...BASE_SUBMISSION, recipientEmail: null });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("stop");
    if (result.outcome === "stop") expect(result.reason).toBe("missing");
  });
});

describe("dispatchGiftClaim — first_send", () => {
  it("issues token, sends first_send email, marks fired + appends emailsFired", async () => {
    mockFind.mockResolvedValueOnce(BASE_SUBMISSION);
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("first_send");
    expect(result.nextAlarmMs).toBe(NOW_MS + SEVEN_DAYS_MS);
    expect(mockIssue).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "first_send",
        recipientEmail: "recipient@example.com",
        recipientName: "Mira",
        purchaserFirstName: "Lior",
      }),
    );
    expect(mockMark).toHaveBeenCalledWith("sub_gift", "b".repeat(64), expect.any(String));
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_claim", resendId: "msg_gift_claim_1" }),
    );
  });

  it("does NOT mark fired or append when Resend returns null resendId", async () => {
    mockFind.mockResolvedValueOnce(BASE_SUBMISSION);
    mockSend.mockResolvedValueOnce({ resendId: null });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 0,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("first_send");
    expect(result.nextAlarmMs).toBe(NOW_MS + SEVEN_DAYS_MS);
    expect(mockMark).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });
});

describe("dispatchGiftClaim — reminder", () => {
  it("sends reminder variant WITHOUT regenerating the token", async () => {
    mockFind.mockResolvedValueOnce({
      ...BASE_SUBMISSION,
      giftClaimEmailFiredAt: new Date(NOW_MS - SEVEN_DAYS_MS - 1).toISOString(),
      giftClaimTokenHash: "b".repeat(64),
    });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 1,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("reminder");
    expect(result.nextAlarmMs).toBe(NOW_MS + SEVEN_DAYS_MS);
    expect(mockIssue).not.toHaveBeenCalled();
    expect(mockMark).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "reminder" }),
    );
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_claim", resendId: "msg_gift_claim_1" }),
    );
  });

  it("reminder skips append when Resend returns null", async () => {
    mockFind.mockResolvedValueOnce({
      ...BASE_SUBMISSION,
      giftClaimEmailFiredAt: new Date(NOW_MS - SEVEN_DAYS_MS - 1).toISOString(),
    });
    mockSend.mockResolvedValueOnce({ resendId: null });
    const result = await dispatchGiftClaim({
      submissionId: "sub_gift",
      retryCount: 1,
      nowMs: NOW_MS,
    });
    expect(result.outcome).toBe("reminder");
    expect(mockAppend).not.toHaveBeenCalled();
  });
});
