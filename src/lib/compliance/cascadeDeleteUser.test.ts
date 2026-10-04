import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../auth/users", () => ({
  findUserById: vi.fn(),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock("../booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn(),
  deleteSubmissionAndPhoto: vi.fn(),
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

vi.mock("../gift/giftRecordMirror", () => ({
  mirrorGiftRecord: vi.fn(async () => {}),
}));

import { createTestGift } from "@/test/fixtures/gift";

import { findUserById } from "../auth/users";
import { dbExec, dbQuery } from "../booking/persistence/sqlClient";
import { deleteSubmissionAndPhoto, listSubmissionsByRecipientUserId } from "../booking/submissions";
import { mirrorGiftRecord } from "../gift/giftRecordMirror";
import { getSanityWriteClient } from "../sanity/client";
import { retrieveCheckoutSession } from "../stripe";
import { cascadeDeleteUser, wasUserDeleted } from "./cascadeDeleteUser";
import { deleteBrevoContact, deleteBrevoSmtpLog } from "./vendors/brevoDelete";
import { createMixpanelDataDeletion } from "./vendors/mixpanelDelete";
import { createStripeRedactionJob } from "./vendors/stripeRedaction";

const mockFindUser = vi.mocked(findUserById);
const mockListSubs = vi.mocked(listSubmissionsByRecipientUserId);
const mockDeleteR2 = vi.mocked(deleteSubmissionAndPhoto);
const mockGetSanity = vi.mocked(getSanityWriteClient);
const mockStripeSession = vi.mocked(retrieveCheckoutSession);
const mockStripeRedact = vi.mocked(createStripeRedactionJob);
const mockBrevoContact = vi.mocked(deleteBrevoContact);
const mockBrevoSmtp = vi.mocked(deleteBrevoSmtpLog);
const mockMixpanel = vi.mocked(createMixpanelDataDeletion);
const mockMirrorGiftRecord = vi.mocked(mirrorGiftRecord);

const sanityCommit = vi.fn();
const sanityUnset = vi.fn(() => ({ commit: sanityCommit }));
const sanityClientStub = {
  fetch: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(() => ({ unset: sanityUnset })),
};

beforeEach(() => {
  vi.stubEnv("BOOKING_DB_DRIVER", "sqlite");
  vi.stubEnv("BOOKING_DB_PATH", ":memory:");
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockMirrorGiftRecord.mockClear();
  sanityClientStub.patch.mockClear();
  sanityUnset.mockClear();
  sanityCommit.mockReset().mockResolvedValue(undefined);

  mockFindUser.mockReset();
  mockListSubs.mockReset();
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
      expect.arrayContaining(["brevo-contact: not configured", "brevo-smtp-log: not configured"]),
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
    expect(result.partialFailures.some((f) => f.startsWith("sanity-doc-delete: sub_1"))).toBe(true);
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
    expect(result.partialFailures).toContain("user: not found (already deleted or never existed)");
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

type GiftRowSnapshot = {
  status: string;
  buyer_email: string | null;
  buyer_first_name: string;
  note: string | null;
  consent_ip_address: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
};

async function insertSubmissionRow(id: string, recipientUserId: string): Promise<void> {
  await dbExec(
    `INSERT INTO submissions (id, email, status, reading_slug, responses_json, created_at, recipient_user_id)
     VALUES (?, ?, 'paid', 'birth-chart', '[]', ?, ?)`,
    [id, "grace@example.com", "2026-10-01T10:00:00.000Z", recipientUserId],
  );
}

async function giftWithRow(row: {
  buyerEmail: string | null;
  stripeSessionId?: string | null;
  redeemedSubmissionId?: string | null;
}): Promise<string> {
  const giftId = await createTestGift();
  await dbExec(
    `UPDATE gift_codes
     SET status = ?, buyer_email = ?, stripe_session_id = ?, redeemed_submission_id = ?,
         recipient_name = 'Grace', recipient_email = 'grace@example.com'
     WHERE id = ?`,
    [
      row.redeemedSubmissionId ? "redeemed" : "active",
      row.buyerEmail,
      row.stripeSessionId ?? null,
      row.redeemedSubmissionId ?? null,
      giftId,
    ],
  );
  return giftId;
}

async function readGiftRow(giftId: string): Promise<GiftRowSnapshot> {
  const rows = await dbQuery<GiftRowSnapshot>(
    `SELECT status, buyer_email, buyer_first_name, note, consent_ip_address, recipient_name, recipient_email
     FROM gift_codes WHERE id = ?`,
    [giftId],
  );
  return rows[0]!;
}

describe("cascadeDeleteUser: gift recipient walk", () => {
  it("nulls the recipient fields of gifts redeemed into the user's submissions, delivered or not", async () => {
    happyPathMocks();
    await insertSubmissionRow("sub_1", "user_a");
    await insertSubmissionRow("sub_undelivered", "user_a");
    await insertSubmissionRow("sub_other_user", "user_b");
    const deliveredGift = await giftWithRow({
      buyerEmail: "buyer@example.com",
      redeemedSubmissionId: "sub_1",
    });
    const undeliveredGift = await giftWithRow({
      buyerEmail: "buyer@example.com",
      redeemedSubmissionId: "sub_undelivered",
    });
    const otherUsersGift = await giftWithRow({
      buyerEmail: "buyer@example.com",
      redeemedSubmissionId: "sub_other_user",
    });

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    for (const giftId of [deliveredGift, undeliveredGift]) {
      expect(await readGiftRow(giftId)).toMatchObject({
        recipient_name: null,
        recipient_email: null,
      });
    }
    expect(await readGiftRow(otherUsersGift)).toMatchObject({
      recipient_name: "Grace",
      recipient_email: "grace@example.com",
    });
  });

  it("clears the recipient fields while the submission rows still exist", async () => {
    happyPathMocks();
    await insertSubmissionRow("sub_1", "user_a");
    const giftId = await giftWithRow({
      buyerEmail: "buyer@example.com",
      redeemedSubmissionId: "sub_1",
    });
    const recipientNameAtSubmissionDelete: Array<string | null> = [];
    mockDeleteR2.mockImplementation(async () => {
      recipientNameAtSubmissionDelete.push((await readGiftRow(giftId)).recipient_name);
      await dbExec(`DELETE FROM submissions WHERE id = ?`, ["sub_1"]);
      return { photoDeleted: true };
    });

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(recipientNameAtSubmissionDelete).toEqual([null]);
  });
});

describe("cascadeDeleteUser: gift buyer walk", () => {
  it("clears the buyer fields and consent IP on every gift row of the normalised email", async () => {
    happyPathMocks();
    mockFindUser.mockResolvedValue({ id: "user_a", email: " Ada@Example.COM" });
    const firstGift = await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_1",
    });
    const secondGift = await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_2",
    });
    const otherBuyersGift = await giftWithRow({
      buyerEmail: "someone@example.com",
      stripeSessionId: "cs_gift_3",
    });

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    for (const giftId of [firstGift, secondGift]) {
      expect(await readGiftRow(giftId)).toMatchObject({
        status: "active",
        buyer_email: null,
        buyer_first_name: "",
        note: null,
        consent_ip_address: null,
      });
    }
    expect(await readGiftRow(otherBuyersGift)).toMatchObject({
      buyer_email: "someone@example.com",
      buyer_first_name: "Marguerite",
      note: "For the long winter ahead",
      consent_ip_address: "203.0.113.7",
    });
  });

  it("sends the gift sessions and their customers to the Stripe redaction job", async () => {
    happyPathMocks();
    await giftWithRow({ buyerEmail: "ada@example.com", stripeSessionId: "cs_gift_1" });
    mockStripeSession
      .mockResolvedValueOnce({ id: "cs_test_1", customer: "cus_1" } as never)
      .mockResolvedValueOnce({ id: "cs_gift_1", customer: "cus_gift" } as never);

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(mockStripeSession).toHaveBeenCalledWith("cs_gift_1");
    expect(mockStripeRedact).toHaveBeenCalledWith({
      customerIds: ["cus_1", "cus_gift"],
      checkoutSessionIds: ["cs_test_1", "cs_gift_1"],
    });
  });

  it("adds gift_<id> to the Mixpanel deletion and the deletion_log ids", async () => {
    happyPathMocks();
    const giftId = await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_1",
    });

    const result = await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(mockMixpanel).toHaveBeenCalledWith(["sub_1", `gift_${giftId}`]);
    const rows = await dbQuery<{ action: string; submission_ids_json: string }>(
      `SELECT action, submission_ids_json FROM deletion_log WHERE user_id = ?`,
      ["user_a"],
    );
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(JSON.parse(row.submission_ids_json)).toEqual(["sub_1", `gift_${giftId}`]);
    }
    expect(result.submissionIds).toEqual(["sub_1"]);
  });

  it("schedules the gift record mirror after the buyer fields are cleared", async () => {
    happyPathMocks();
    const giftId = await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_1",
    });
    const buyerEmailAtMirror: Array<string | null> = [];
    mockMirrorGiftRecord.mockImplementationOnce(async (id) => {
      buyerEmailAtMirror.push((await readGiftRow(id)).buyer_email);
    });

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(mockMirrorGiftRecord).toHaveBeenCalledWith(giftId);
    await vi.waitFor(() => expect(buyerEmailAtMirror).toEqual([null]));
  });

  it("unsets gift.buyerFirstName on the submission the gift was redeemed into", async () => {
    happyPathMocks();
    await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_1",
      redeemedSubmissionId: "sub_recipient",
    });

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(sanityClientStub.patch).toHaveBeenCalledWith("sub_recipient");
    expect(sanityUnset).toHaveBeenCalledWith(["gift.buyerFirstName"]);
    expect(sanityCommit).toHaveBeenCalledOnce();
  });

  it("skips the unset when the redeemed submission is deleted by the same cascade", async () => {
    happyPathMocks();
    await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_1",
      redeemedSubmissionId: "sub_1",
    });

    await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(sanityClientStub.patch).not.toHaveBeenCalled();
  });

  it("records a failed unset as a partial failure and finishes the cascade", async () => {
    happyPathMocks();
    await giftWithRow({
      buyerEmail: "ada@example.com",
      stripeSessionId: "cs_gift_1",
      redeemedSubmissionId: "sub_recipient",
    });
    sanityCommit.mockRejectedValueOnce(new Error("sanity 503"));

    const result = await cascadeDeleteUser("user_a", { performedBy: "admin@withjosephine.com" });

    expect(result.partialFailures).toContain("sanity-gift-buyer-unset: sub_recipient - sanity 503");
    expect(mockStripeRedact).toHaveBeenCalled();
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
