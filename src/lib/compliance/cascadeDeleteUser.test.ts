import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/users", () => ({
  findUserById: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock("../booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn(),
  listGiftsByPurchaserUserId: vi.fn(),
  deleteSubmissionAndPhoto: vi.fn(),
  pseudonymisePurchaserGift: vi.fn(),
}));

vi.mock("../sanity/client", () => ({
  getSanityWriteClient: vi.fn(),
}));

vi.mock("../stripe", () => ({
  retrieveCheckoutSession: vi.fn(),
}));

vi.mock("./vendors/stripeRedaction", () => ({
  createStripeRedactionJob: vi.fn(),
}));

vi.mock("./vendors/brevoDelete", () => ({
  deleteBrevoContact: vi.fn(),
  deleteBrevoSmtpLog: vi.fn(),
}));

vi.mock("./vendors/mixpanelDelete", () => ({
  createMixpanelDataDeletion: vi.fn(),
}));

import { findUserById } from "../auth/users";
import { dbQuery } from "../booking/persistence/sqlClient";
import {
  deleteSubmissionAndPhoto,
  listGiftsByPurchaserUserId,
  listSubmissionsByRecipientUserId,
  pseudonymisePurchaserGift,
} from "../booking/submissions";
import { getSanityWriteClient } from "../sanity/client";
import { retrieveCheckoutSession } from "../stripe";
import { cascadeDeleteUser, wasUserDeleted } from "./cascadeDeleteUser";
import { deleteBrevoContact, deleteBrevoSmtpLog } from "./vendors/brevoDelete";
import { createMixpanelDataDeletion } from "./vendors/mixpanelDelete";
import { createStripeRedactionJob } from "./vendors/stripeRedaction";

const mockFindUser = vi.mocked(findUserById);
const mockListSubs = vi.mocked(listSubmissionsByRecipientUserId);
const mockListGifts = vi.mocked(listGiftsByPurchaserUserId);
const mockPseudonymise = vi.mocked(pseudonymisePurchaserGift);
const mockDeleteR2 = vi.mocked(deleteSubmissionAndPhoto);
const mockGetSanity = vi.mocked(getSanityWriteClient);
const mockStripeSession = vi.mocked(retrieveCheckoutSession);
const mockStripeRedact = vi.mocked(createStripeRedactionJob);
const mockBrevoContact = vi.mocked(deleteBrevoContact);
const mockBrevoSmtp = vi.mocked(deleteBrevoSmtpLog);
const mockMixpanel = vi.mocked(createMixpanelDataDeletion);

const sanityClientStub = {
  fetch: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.stubEnv("BOOKING_DB_DRIVER", "sqlite");
  vi.stubEnv("BOOKING_DB_PATH", ":memory:");

  mockFindUser.mockReset();
  mockListSubs.mockReset();
  mockListGifts.mockReset().mockResolvedValue([]);
  mockPseudonymise.mockReset().mockResolvedValue(undefined);
  mockDeleteR2.mockReset().mockResolvedValue({ photoDeleted: true });
  mockGetSanity.mockReset();
  mockStripeSession.mockReset();
  mockStripeRedact.mockReset();
  mockBrevoContact.mockReset();
  mockBrevoSmtp.mockReset();
  mockMixpanel.mockReset();
  sanityClientStub.fetch.mockReset();
  sanityClientStub.delete.mockReset().mockResolvedValue(undefined);
  mockGetSanity.mockReturnValue(sanityClientStub as never);
  sanityClientStub.fetch.mockResolvedValue({
    voiceNote: { asset: { _ref: "file-voice-asset-id" } },
    readingPdf: { asset: { _ref: "file-pdf-asset-id" } },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const USER = { id: "user_a", email: "ada@example.com" };

const SUBMISSION_BASE = {
  _id: "sub_1",
  status: "paid" as const,
  email: "ada@example.com",
  responses: [],
  createdAt: "2026-04-20T10:00:00Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: 9900,
  amountPaidCurrency: "usd",
  recipientUserId: "user_a",
  photoR2Key: "submissions/sub_1/photo.jpg",
  stripeSessionId: "cs_test_1",
  isGift: false,
  purchaserUserId: null,
  recipientEmail: null,
  giftDeliveryMethod: null,
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: null,
  giftCancelledAt: null,
};

function happyPathMocks() {
  mockFindUser.mockResolvedValue(USER);
  mockListSubs.mockResolvedValue([SUBMISSION_BASE]);
  mockStripeSession.mockResolvedValue({ id: "cs_test_1", customer: "cus_1" } as never);
  mockStripeRedact.mockResolvedValue({ ok: true, trackingId: "redact_job_99" });
  mockBrevoContact.mockResolvedValue({ ok: true, trackingId: null });
  mockBrevoSmtp.mockResolvedValue({ ok: true, trackingId: "proc_42" });
  mockMixpanel.mockResolvedValue({ ok: true, trackingId: "mp_task_7" });
}

describe("cascadeDeleteUser — happy path", () => {
  it("returns success with all tracking IDs and no partial failures", async () => {
    happyPathMocks();
    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });

    expect(result.success).toBe(true);
    expect(result.userId).toBe("user_a");
    expect(result.submissionIds).toEqual(["sub_1"]);
    expect(result.partialFailures).toEqual([]);
    expect(result.stripeRedactionJobId).toBe("redact_job_99");
    expect(result.brevoSmtpProcessId).toBe("proc_42");
    expect(result.mixpanelTaskId).toBe("mp_task_7");
  });

  it("invokes the cascade in the order: R2+D1 → Sanity doc → Sanity assets → vendors → user rows", async () => {
    happyPathMocks();
    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    // R2+D1 (deleteSubmissionAndPhoto) before Sanity doc-delete.
    expect(mockDeleteR2).toHaveBeenCalledBefore(sanityClientStub.delete as never);
    // First Sanity delete call is the doc, then the assets.
    expect(sanityClientStub.delete).toHaveBeenNthCalledWith(1, "sub_1");
    expect(sanityClientStub.delete).toHaveBeenNthCalledWith(2, "file-voice-asset-id");
    expect(sanityClientStub.delete).toHaveBeenNthCalledWith(3, "file-pdf-asset-id");
    // Vendor cascades fire after submission cleanup.
    expect(sanityClientStub.delete).toHaveBeenCalledBefore(mockStripeRedact as never);
  });

  it("passes submission_ids to Mixpanel as distinct_ids", async () => {
    happyPathMocks();
    mockListSubs.mockResolvedValueOnce([
      SUBMISSION_BASE,
      { ...SUBMISSION_BASE, _id: "sub_2", stripeSessionId: "cs_test_2" },
    ]);
    mockStripeSession.mockResolvedValue({ id: "cs_x", customer: "cus_1" } as never);

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });
    expect(mockMixpanel).toHaveBeenCalledWith(["sub_1", "sub_2"]);
  });

  it("resolves and deduplicates Stripe customer IDs across submissions", async () => {
    happyPathMocks();
    mockListSubs.mockResolvedValueOnce([
      SUBMISSION_BASE,
      { ...SUBMISSION_BASE, _id: "sub_2", stripeSessionId: "cs_test_2" },
    ]);
    mockStripeSession
      .mockResolvedValueOnce({ id: "cs_test_1", customer: "cus_shared" } as never)
      .mockResolvedValueOnce({ id: "cs_test_2", customer: "cus_shared" } as never);

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });
    expect(mockStripeRedact).toHaveBeenCalledWith({
      customerIds: ["cus_shared"],
      checkoutSessionIds: ["cs_test_1", "cs_test_2"],
    });
  });
});

describe("cascadeDeleteUser — partial-failure branches", () => {
  it("continues when Stripe redaction returns ok=false", async () => {
    happyPathMocks();
    mockStripeRedact.mockResolvedValueOnce({ ok: false, error: "stripe: HTTP 500 — boom" });

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });
    expect(result.success).toBe(true);
    expect(result.stripeRedactionJobId).toBeNull();
    expect(result.partialFailures).toContain("stripe: HTTP 500 — boom");
    expect(mockBrevoContact).toHaveBeenCalled();
    expect(mockMixpanel).toHaveBeenCalled();
  });

  it("continues when Brevo isn't configured", async () => {
    happyPathMocks();
    mockBrevoContact.mockResolvedValueOnce({ ok: false, error: "brevo-contact: not configured" });
    mockBrevoSmtp.mockResolvedValueOnce({ ok: false, error: "brevo-smtp-log: not configured" });

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });
    expect(result.success).toBe(true);
    expect(result.partialFailures).toEqual(
      expect.arrayContaining([
        "brevo-contact: not configured",
        "brevo-smtp-log: not configured",
      ]),
    );
    expect(mockMixpanel).toHaveBeenCalled();
  });

  it("captures Sanity doc-delete failure and continues to vendor cascade", async () => {
    happyPathMocks();
    sanityClientStub.delete.mockRejectedValueOnce(new Error("sanity 503"));

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });
    expect(result.success).toBe(true);
    expect(
      result.partialFailures.some((f) => f.startsWith("sanity-doc-delete: sub_1")),
    ).toBe(true);
    expect(mockStripeRedact).toHaveBeenCalled();
  });

  it("captures Stripe session lookup failure but still redacts checkout_session ids it could resolve", async () => {
    happyPathMocks();
    mockStripeSession.mockRejectedValueOnce(new Error("stripe down"));

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });
    // No customer_ids resolved, but checkout_session id still present.
    expect(mockStripeRedact).toHaveBeenCalledWith({
      customerIds: [],
      checkoutSessionIds: ["cs_test_1"],
    });
  });
});

describe("cascadeDeleteUser — idempotent re-run", () => {
  it("no-ops cleanly when user does not exist (already deleted)", async () => {
    mockFindUser.mockResolvedValueOnce(null);
    const result = await cascadeDeleteUser("user_missing", {
      performedBy: "admin@withjosephine.com",
    });
    expect(result.success).toBe(true);
    expect(result.submissionIds).toEqual([]);
    expect(result.partialFailures).toContain(
      "user: not found (already deleted or never existed)",
    );
    expect(mockStripeRedact).not.toHaveBeenCalled();
    expect(mockBrevoContact).not.toHaveBeenCalled();
  });

  it("submits the cascade against an empty submission set when user has none", async () => {
    mockFindUser.mockResolvedValueOnce(USER);
    mockListSubs.mockResolvedValueOnce([]);
    mockBrevoContact.mockResolvedValue({ ok: true, trackingId: null });
    mockBrevoSmtp.mockResolvedValue({ ok: true, trackingId: null });
    // Stripe redact would refuse empty input — partial failure expected.
    mockStripeRedact.mockResolvedValue({ ok: false, error: "stripe: no objects to redact" });
    // Mixpanel refuses empty distinct_ids.
    mockMixpanel.mockResolvedValue({ ok: false, error: "mixpanel: no distinct_ids to delete" });

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });
    expect(result.success).toBe(true);
    expect(result.submissionIds).toEqual([]);
    expect(result.partialFailures.length).toBeGreaterThan(0);
  });
});

describe("wasUserDeleted", () => {
  it("returns false initially and true after a completed cascade", async () => {
    happyPathMocks();
    expect(await wasUserDeleted("user_a")).toBe(false);
    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });
    expect(await wasUserDeleted("user_a")).toBe(true);
  });
});

describe("cascadeDeleteUser — LB-4 purchaser walk (Phase 5 Session 4b)", () => {
  const GIFT_PURCHASE_BASE = {
    ...SUBMISSION_BASE,
    _id: "gift_1",
    isGift: true,
    purchaserUserId: "user_a",
    photoR2Key: undefined,
    stripeSessionId: "cs_gift_1",
    responses: [
      {
        fieldKey: "purchaser_first_name",
        fieldLabelSnapshot: "Your first name",
        fieldType: "text",
        value: "Ada",
      },
      {
        fieldKey: "recipient_name",
        fieldLabelSnapshot: "Recipient name",
        fieldType: "text",
        value: "Belinda",
      },
    ],
  };

  it("pseudonymises a claimed gift where recipient is a distinct user", async () => {
    happyPathMocks();
    mockListSubs.mockResolvedValueOnce([]); // user_a is the purchaser, not the recipient
    mockListGifts.mockResolvedValueOnce([
      {
        ...GIFT_PURCHASE_BASE,
        recipientUserId: "user_b", // distinct from purchaser
        giftClaimedAt: "2026-05-01T10:00:00Z",
      },
    ]);

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });

    expect(result.success).toBe(true);
    expect(mockPseudonymise).toHaveBeenCalledWith({
      _id: "gift_1",
      responses: GIFT_PURCHASE_BASE.responses,
    });
    // gift row NOT deleted — recipient's claim path must survive
    expect(mockDeleteR2).not.toHaveBeenCalledWith(
      expect.objectContaining({ _id: "gift_1" }),
    );
  });

  it("fully deletes an unclaimed gift (recipient_user_id IS NULL)", async () => {
    happyPathMocks();
    mockListSubs.mockResolvedValueOnce([]);
    mockListGifts.mockResolvedValueOnce([
      {
        ...GIFT_PURCHASE_BASE,
        recipientUserId: null, // not yet claimed
      },
    ]);

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });

    expect(result.success).toBe(true);
    expect(mockPseudonymise).not.toHaveBeenCalled();
    expect(mockDeleteR2).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "gift_1" }),
    );
  });

  it("skips purchaser-walk rows already handled by the recipient walk (self-purchase)", async () => {
    happyPathMocks();
    // recipient walk surfaces the self-purchase
    mockListSubs.mockResolvedValueOnce([
      { ...GIFT_PURCHASE_BASE, recipientUserId: "user_a" },
    ]);
    // purchaser walk surfaces the same row
    mockListGifts.mockResolvedValueOnce([
      { ...GIFT_PURCHASE_BASE, recipientUserId: "user_a" },
    ]);

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    // Pseudonymise must NOT be called for the row already deleted by recipient walk.
    expect(mockPseudonymise).not.toHaveBeenCalled();
    // deleteSubmissionAndPhoto called ONCE (the recipient walk).
    expect(mockDeleteR2).toHaveBeenCalledTimes(1);
  });

  it("includes purchaser-walk submission ids in the audit log", async () => {
    happyPathMocks();
    mockListSubs.mockResolvedValueOnce([]);
    mockListGifts.mockResolvedValueOnce([
      { ...GIFT_PURCHASE_BASE, recipientUserId: "user_b" },
    ]);

    const result = await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
    });

    expect(result.submissionIds).toContain("gift_1");
  });
});

describe("deletion_log audit row", () => {
  it("writes a started+completed pair with hashed email and tracking IDs", async () => {
    happyPathMocks();
    await cascadeDeleteUser("user_a", {
      performedBy: "admin@withjosephine.com",
      ipHash: "ip_hash_123",
    });

    const rows = await dbQuery<{
      id: string;
      user_id: string;
      email_hash: string;
      performed_by: string;
      action: string;
      stripe_redaction_job_id: string | null;
      brevo_smtp_process_id: string | null;
      mixpanel_task_id: string | null;
      ip_hash: string | null;
    }>(`SELECT * FROM deletion_log WHERE user_id = ? ORDER BY action`, ["user_a"]);

    expect(rows).toHaveLength(2);
    const completed = rows.find((r) => r.action === "completed")!;
    const started = rows.find((r) => r.action === "started")!;
    expect(started.performed_by).toBe("admin@withjosephine.com");
    // Stable SHA-256("ada@example.com"). Verified at write time; immutable
    // hash means future "did this email get deleted?" queries still resolve.
    expect(started.email_hash).toBe(
      "b5fc85e55755f9e0d030a10ab4429b6b2944855f9a0d60077fe832becbc41d72",
    );
    expect(started.ip_hash).toBe("ip_hash_123");
    expect(completed.stripe_redaction_job_id).toBe("redact_job_99");
    expect(completed.brevo_smtp_process_id).toBe("proc_42");
    expect(completed.mixpanel_task_id).toBe("mp_task_7");
  });
});
