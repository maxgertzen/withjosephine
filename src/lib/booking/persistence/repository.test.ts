import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildRedeemGiftStatement } from "@/lib/gift/gifts";
import { createTestGift, forceGiftStatus } from "@/test/fixtures/gift";

import type { EmailFiredEntry } from "../submissions";
import {
  appendEmailFailure,
  appendEmailFired,
  buildCreateSubmissionStatement,
  buildMarkSubmissionPaidStatement,
  claimReadingDeliveryAttempt,
  claimReadingDeliveryAttemptBody,
  clearReadingDeliveryAttempt,
  createSubmission,
  type CreateSubmissionInput,
  deleteSubmission,
  findGiftRecipientThankYou,
  findPaidStripeSessionId,
  findSubmissionById,
  findSubmissionByResendId,
  findSubmissionListenContext,
  hasGiftSubmission,
  insertFinancialRecord,
  listAllReferencedPhotoKeys,
  listPaidSubmissionsForEmail,
  listSubmissionsByRecipientUserId,
  listSubmissionsByStatusOlderThan,
  markReadingDeliverySentIfUnrecorded,
  markSubmissionDeliveredIfUnset,
  markSubmissionExpired,
  type MarkSubmissionPaidInput,
  type NewEmailFailure,
  setSubmissionEmailAndRecipient,
  setSubmissionRecipientUser,
  unsetPhotoR2Key,
} from "./repository";
import { dbBatch, dbExec, dbQuery } from "./sqlClient";

async function markSubmissionPaid(id: string, paid: MarkSubmissionPaidInput): Promise<void> {
  const { sql, params } = buildMarkSubmissionPaidStatement(id, paid);
  await dbExec(sql, params ?? []);
}

const BASE_INPUT: CreateSubmissionInput = {
  id: "sub_1",
  email: "ada@example.com",
  status: "pending",
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  responses: [
    {
      fieldKey: "first_name",
      fieldLabelSnapshot: "First name",
      fieldType: "shortText",
      value: "Ada",
    },
  ],
  consentLabel: "I acknowledge non-refundable",
  photoR2Key: "submissions/sub_1/photo.jpg",
  createdAt: "2026-04-20T10:00:00Z",
};

beforeEach(() => {
  vi.stubEnv("BOOKING_DB_DRIVER", "sqlite");
  vi.stubEnv("BOOKING_DB_PATH", ":memory:");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("repository against in-memory SQLite", () => {
  it("creates a submission and reads it back", async () => {
    await createSubmission(BASE_INPUT);
    const record = await findSubmissionById("sub_1");
    expect(record).not.toBeNull();
    expect(record?._id).toBe("sub_1");
    expect(record?.status).toBe("pending");
    expect(record?.email).toBe("ada@example.com");
    expect(record?.reading?.name).toBe("Soul Blueprint");
    expect(record?.responses).toHaveLength(1);
    expect(record?.responses[0]?.fieldKey).toBe("first_name");
    expect(record?.emailsFired).toEqual([]);
  });

  it("flags legacy gift rows as isLegacyGift and leaves other rows unflagged", async () => {
    await createSubmission(BASE_INPUT);
    await createSubmission({ ...BASE_INPUT, id: "sub_gift" });
    await dbExec(`UPDATE submissions SET is_gift = 1 WHERE id = ?`, ["sub_gift"]);

    expect((await findSubmissionById("sub_gift"))?.isLegacyGift).toBe(true);
    expect((await findSubmissionById("sub_1"))?.isLegacyGift).toBeUndefined();
  });

  it("returns null when submission missing", async () => {
    expect(await findSubmissionById("does-not-exist")).toBeNull();
  });

  it("marks paid + records Stripe identifiers", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-21T10:00:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
    });
    const record = await findSubmissionById("sub_1");
    expect(record?.status).toBe("paid");
    expect(record?.paidAt).toBe("2026-04-21T10:00:00Z");
    expect(record?.stripeEventId).toBe("evt_1");
    expect(record?.stripeSessionId).toBe("cs_1");
    expect(record?.amountPaidCents).toBe(9900);
    expect(record?.amountPaidCurrency).toBe("usd");
  });

  it("keeps the first paid event when a second paid apply targets the same submission", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-21T10:00:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
    });
    await markSubmissionPaid("sub_1", {
      stripeEventId: "reconcile:cs_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-21T11:00:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
    });
    const record = await findSubmissionById("sub_1");
    expect(record?.stripeEventId).toBe("evt_1");
    expect(record?.paidAt).toBe("2026-04-21T10:00:00Z");
  });

  it("finds the session a submission is paid by", async () => {
    await createSubmission(BASE_INPUT);
    expect(await findPaidStripeSessionId("sub_1")).toBeNull();

    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-21T10:00:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
    });
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_2",
      stripeSessionId: "cs_2",
      paidAt: "2026-04-21T10:01:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
    });

    expect(await findPaidStripeSessionId("sub_1")).toBe("cs_1");
    expect(await findPaidStripeSessionId("sub_missing")).toBeNull();
  });

  it("does not mark a paid submission expired", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-21T10:00:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
    });
    await markSubmissionExpired("sub_1", {
      stripeEventId: "evt_expired",
      expiredAt: "2026-04-22T10:00:00Z",
    });
    await markSubmissionExpired("sub_1", { expiredAt: "2026-04-22T10:00:00Z" });
    const record = await findSubmissionById("sub_1");
    expect(record?.status).toBe("paid");
    expect(record?.stripeEventId).toBe("evt_1");
  });

  it("marks expired with optional Stripe event id", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionExpired("sub_1", { expiredAt: "2026-04-22T10:00:00Z" });
    expect((await findSubmissionById("sub_1"))?.status).toBe("expired");

    await createSubmission({ ...BASE_INPUT, id: "sub_2" });
    await markSubmissionExpired("sub_2", {
      stripeEventId: "evt_expired",
      expiredAt: "2026-04-22T10:00:00Z",
    });
    const withEvent = await findSubmissionById("sub_2");
    expect(withEvent?.status).toBe("expired");
    expect(withEvent?.stripeEventId).toBe("evt_expired");
  });

  it("appends emailsFired entries idempotently per call", async () => {
    await createSubmission(BASE_INPUT);
    await appendEmailFired("sub_1", {
      type: "order_confirmation",
      sentAt: "2026-04-21T10:00:00Z",
      resendId: "msg_1",
    });
    await appendEmailFired("sub_1", {
      type: "order_confirmation",
      sentAt: "2026-04-23T10:00:00Z",
      resendId: "msg_2",
    });
    const record = await findSubmissionById("sub_1");
    expect(record?.emailsFired).toHaveLength(2);
    expect(record?.emailsFired?.[0]?.type).toBe("order_confirmation");
    expect(record?.emailsFired?.[1]?.type).toBe("order_confirmation");
  });

  it("lists submissions older than a cutoff filtered by status", async () => {
    await createSubmission({ ...BASE_INPUT, id: "old", createdAt: "2026-04-01T00:00:00Z" });
    await createSubmission({ ...BASE_INPUT, id: "new", createdAt: "2026-04-29T00:00:00Z" });
    const stale = await listSubmissionsByStatusOlderThan("pending", "2026-04-15T00:00:00Z");
    expect(stale.map((r) => r._id)).toEqual(["old"]);
  });

  it("listPaidSubmissionsForEmail filters by emailsFired absence + paidBefore", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-20T10:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });

    let due = await listPaidSubmissionsForEmail("order_confirmation", { paidBefore: "2026-04-30T00:00:00Z" });
    expect(due.map((r) => r._id)).toEqual(["sub_1"]);

    await appendEmailFired("sub_1", {
      type: "order_confirmation",
      sentAt: "2026-04-22T10:00:00Z",
      resendId: "msg_d2",
    });

    due = await listPaidSubmissionsForEmail("order_confirmation", { paidBefore: "2026-04-30T00:00:00Z" });
    expect(due).toEqual([]);
  });

  it("markSubmissionDeliveredIfUnset writes deliveredAt + URL strings to D1", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-20T10:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });
    const { markSubmissionDeliveredIfUnset } = await import("./repository");
    await markSubmissionDeliveredIfUnset("sub_1", {
      deliveredAt: "2026-04-27T10:00:00Z",
      voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
      pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
    });
    const record = await findSubmissionById("sub_1");
    expect(record?.deliveredAt).toBe("2026-04-27T10:00:00Z");
    expect(record?.voiceNoteUrl).toBe("https://cdn.sanity.io/files/.../voice.m4a");
    expect(record?.pdfUrl).toBe("https://cdn.sanity.io/files/.../reading.pdf");

    await markSubmissionDeliveredIfUnset("sub_1", {
      deliveredAt: "2026-05-03T10:00:00Z",
      voiceNoteUrl: "https://cdn.sanity.io/files/.../voice-v2.m4a",
      pdfUrl: "https://cdn.sanity.io/files/.../reading-v2.pdf",
    });
    const repeated = await findSubmissionById("sub_1");
    expect(repeated?.deliveredAt).toBe("2026-04-27T10:00:00Z");
    expect(repeated?.voiceNoteUrl).toBe("https://cdn.sanity.io/files/.../voice-v2.m4a");
  });

  it("claimReadingDeliveryAttempt stores the first attempt and returns it to every later claim", async () => {
    await createSubmission(BASE_INPUT);
    const first = { attemptedAt: "2026-04-29T12:00:00.000Z", jti: "jti-first" };

    expect(await claimReadingDeliveryAttempt("sub_1", first)).toEqual({ ...first, body: null });
    expect(
      await claimReadingDeliveryAttempt("sub_1", {
        attemptedAt: "2026-04-29T18:00:00.000Z",
        jti: "jti-second",
      }),
    ).toEqual({ ...first, body: null });
    expect(await claimReadingDeliveryAttempt("sub_missing", first)).toBeNull();
  });

  it("clearReadingDeliveryAttempt lets the next claim start a fresh attempt", async () => {
    await createSubmission(BASE_INPUT);
    await claimReadingDeliveryAttempt("sub_1", {
      attemptedAt: "2026-04-29T12:00:00.000Z",
      jti: "jti-first",
    });
    await clearReadingDeliveryAttempt("sub_1");
    const fresh = { attemptedAt: "2026-04-30T12:00:00.000Z", jti: "jti-fresh" };

    expect(await claimReadingDeliveryAttempt("sub_1", fresh)).toEqual({ ...fresh, body: null });
  });

  describe("markReadingDeliverySentIfUnrecorded", () => {
    const delivery = {
      deliveredAt: "2026-04-29T12:00:00.000Z",
      voiceNoteUrl: "https://cdn.sanity.io/voice.m4a",
      pdfUrl: "https://cdn.sanity.io/reading.pdf",
    };
    const entry = {
      type: "reading_delivery" as const,
      sentAt: delivery.deliveredAt,
      resendId: "msg_d7",
    };

    it("writes the reading_delivery entry once", async () => {
      await createSubmission(BASE_INPUT);

      expect(await markReadingDeliverySentIfUnrecorded("sub_1", delivery, entry)).toEqual([]);
      expect(
        await markReadingDeliverySentIfUnrecorded(
          "sub_1",
          { ...delivery, deliveredAt: "2026-04-30T00:00:00.000Z" },
          entry,
        ),
      ).toBeNull();

      const record = await findSubmissionById("sub_1");
      expect(record?.emailsFired).toEqual([entry]);
      expect(record?.deliveredAt).toBe(delivery.deliveredAt);
    });

    it("writes nothing when a legacy day7 entry is already recorded", async () => {
      await createSubmission(BASE_INPUT);
      await appendEmailFired("sub_1", { ...entry, type: "day7" } as unknown as typeof entry);

      expect(await markReadingDeliverySentIfUnrecorded("sub_1", delivery, entry)).toBeNull();
      const record = await findSubmissionById("sub_1");
      expect(record?.emailsFired?.map((fired) => fired.type)).toEqual(["day7"]);
    });
  });

  it.each(["reading_overdue_alert", "day7-overdue-alert"])(
    "listPaidSubmissionsForEmail skips a submission whose overdue alert is stored as %s",
    async (storedType) => {
      await createSubmission(BASE_INPUT);
      await markSubmissionPaid("sub_1", {
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-20T10:00:00Z",
        amountPaidCents: null,
        amountPaidCurrency: null,
      });
      await appendEmailFired("sub_1", {
        type: storedType,
        sentAt: "2026-04-28T10:00:00Z",
        resendId: "msg_alert",
      } as unknown as EmailFiredEntry);

      const due = await listPaidSubmissionsForEmail("reading_overdue_alert", {
        paidBefore: "2026-04-30T00:00:00Z",
      });
      expect(due).toEqual([]);
    },
  );

  it("listAllReferencedPhotoKeys returns the set of non-null keys", async () => {
    await createSubmission(BASE_INPUT);
    await createSubmission({ ...BASE_INPUT, id: "sub_2", photoR2Key: null });
    const keys = await listAllReferencedPhotoKeys();
    expect(keys.has("submissions/sub_1/photo.jpg")).toBe(true);
    expect(keys.size).toBe(1);
  });

  it("unsetPhotoR2Key clears the field", async () => {
    await createSubmission(BASE_INPUT);
    await unsetPhotoR2Key("sub_1");
    const record = await findSubmissionById("sub_1");
    expect(record?.photoR2Key).toBeUndefined();
  });

  it("deleteSubmission removes the row", async () => {
    await createSubmission(BASE_INPUT);
    await deleteSubmission("sub_1");
    expect(await findSubmissionById("sub_1")).toBeNull();
  });

  describe("listSubmissionsByRecipientUserId", () => {
    async function seedDeliveredFor(userId: string, id: string, createdAt: string) {
      await createSubmission({ ...BASE_INPUT, id, createdAt });
      await markSubmissionPaid(id, {
        stripeEventId: `evt_${id}`,
        stripeSessionId: `cs_${id}`,
        paidAt: createdAt,
        amountPaidCents: null,
        amountPaidCurrency: null,
        recipientUserId: userId,
      });
      await markSubmissionDeliveredIfUnset(id, {
        deliveredAt: createdAt,
        voiceNoteUrl: `https://cdn.sanity.io/${id}.m4a`,
        pdfUrl: `https://cdn.sanity.io/${id}.pdf`,
      });
    }

    it("returns paid + delivered submissions for the given user, newest first", async () => {
      await seedDeliveredFor("user_a", "sub_old", "2026-04-01T00:00:00Z");
      await seedDeliveredFor("user_a", "sub_new", "2026-05-01T00:00:00Z");
      await seedDeliveredFor("user_b", "sub_other", "2026-05-02T00:00:00Z");

      const list = await listSubmissionsByRecipientUserId("user_a");
      expect(list.map((r) => r._id)).toEqual(["sub_new", "sub_old"]);
    });

    it("excludes pending submissions even when recipient_user_id is set", async () => {
      await createSubmission({ ...BASE_INPUT, id: "sub_pending" });
      await setSubmissionRecipientUser("sub_pending", "user_a");
      const list = await listSubmissionsByRecipientUserId("user_a");
      expect(list).toEqual([]);
    });

    it("excludes paid-but-not-delivered submissions", async () => {
      await createSubmission(BASE_INPUT);
      await markSubmissionPaid("sub_1", {
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-05-01T00:00:00Z",
        amountPaidCents: null,
        amountPaidCurrency: null,
        recipientUserId: "user_a",
      });
      const list = await listSubmissionsByRecipientUserId("user_a");
      expect(list).toEqual([]);
    });

    it("returns empty list for users with no submissions", async () => {
      expect(await listSubmissionsByRecipientUserId("nobody")).toEqual([]);
    });
  });

  describe("insertFinancialRecord", () => {
    it("writes a row into financial_records", async () => {
      await insertFinancialRecord({
        submissionId: "sub_1",
        userId: "user_test_1",
        email: "ada@example.com",
        paidAt: "2026-04-21T10:00:00.000Z",
        amountPaidCents: 9900,
        amountPaidCurrency: "usd",
        country: "GB",
        stripeSessionId: "cs_1",
        retainedUntil: "2032-04-21T10:00:00.000Z",
      });

      const rows = await dbQuery<{
        submission_id: string;
        user_id: string | null;
        email: string;
        paid_at: string;
        amount_paid_cents: number;
        amount_paid_currency: string;
        country: string | null;
        stripe_session_id: string;
        retained_until: string;
      }>(`SELECT * FROM financial_records WHERE submission_id = ?`, ["sub_1"]);
      expect(rows).toHaveLength(1);
      const row = rows[0]!;
      expect(row.user_id).toBe("user_test_1");
      expect(row.email).toBe("ada@example.com");
      expect(row.amount_paid_cents).toBe(9900);
      expect(row.country).toBe("GB");
      expect(row.retained_until).toBe("2032-04-21T10:00:00.000Z");
    });

    it("is idempotent — a second insert for the same submission_id is ignored", async () => {
      const input = {
        submissionId: "sub_2",
        userId: null,
        email: "leo@example.com",
        paidAt: "2026-04-21T10:00:00.000Z",
        amountPaidCents: 7900,
        amountPaidCurrency: "usd",
        country: null,
        stripeSessionId: "cs_2",
        retainedUntil: "2032-04-21T10:00:00.000Z",
      };
      await insertFinancialRecord(input);
      // Same key, different amount — second insert should be ignored, not updated.
      await insertFinancialRecord({ ...input, amountPaidCents: 99999 });

      const rows = await dbQuery<{ amount_paid_cents: number }>(
        `SELECT amount_paid_cents FROM financial_records WHERE submission_id = ?`,
        ["sub_2"],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.amount_paid_cents).toBe(7900);
    });
  });

  describe("findSubmissionListenContext", () => {
    it("returns readingName, firstName, and lastName from the row", async () => {
      await createSubmission({
        ...BASE_INPUT,
        id: "sub_listen_1",
        readingName: "Soul Blueprint",
        responses: [
          { fieldKey: "first_name", fieldLabelSnapshot: "First name", fieldType: "shortText", value: "Test" },
          { fieldKey: "last_name", fieldLabelSnapshot: "Last name", fieldType: "shortText", value: "User" },
        ],
      });
      const ctx = await findSubmissionListenContext("sub_listen_1");
      expect(ctx).not.toBeNull();
      expect(ctx?.readingSlug).toBe("soul-blueprint");
      expect(ctx?.readingName).toBe("Soul Blueprint");
      expect(ctx?.firstName).toBe("Test");
      expect(ctx?.lastName).toBe("User");
    });

    it("returns null firstName and lastName when responses lack those fields", async () => {
      await createSubmission({
        ...BASE_INPUT,
        id: "sub_listen_2",
        readingName: "Birth Chart",
        responses: [
          { fieldKey: "anything_else", fieldLabelSnapshot: "Anything else?", fieldType: "longText", value: "No" },
        ],
      });
      const ctx = await findSubmissionListenContext("sub_listen_2");
      expect(ctx?.firstName).toBeNull();
      expect(ctx?.lastName).toBeNull();
      expect(ctx?.readingName).toBe("Birth Chart");
    });

    it("returns null readingName when the column is null", async () => {
      await createSubmission({
        ...BASE_INPUT,
        id: "sub_listen_3",
        readingName: null,
        responses: [
          { fieldKey: "first_name", fieldLabelSnapshot: "First name", fieldType: "shortText", value: "Ada" },
        ],
      });
      const ctx = await findSubmissionListenContext("sub_listen_3");
      expect(ctx?.readingName).toBeNull();
      expect(ctx?.firstName).toBe("Ada");
    });

    it("returns null when submission does not exist", async () => {
      expect(await findSubmissionListenContext("does-not-exist")).toBeNull();
    });
  });

  const failure = (overrides: Partial<NewEmailFailure> = {}): NewEmailFailure => ({
    emailType: "reading_delivery",
    kind: "send_error",
    recipient: "ada@example.com",
    attemptedAt: "2026-04-29T12:00:00.000Z",
    failedAt: "2026-04-29T12:00:01.000Z",
    statusCode: 422,
    errorCode: "validation_error",
    errorMessage: null,
    bounceType: null,
    resendId: null,
    ...overrides,
  });

  describe("reading delivery attempt body", () => {
    const attempt = { attemptedAt: "2026-04-29T12:00:00.000Z", jti: "jti-first" };
    const body = { subject: "Your reading", html: "<p>first</p>" };

    it("returns no body with a fresh attempt and the stored body with every later claim", async () => {
      await createSubmission(BASE_INPUT);

      expect(await claimReadingDeliveryAttempt("sub_1", attempt)).toEqual({ ...attempt, body: null });
      expect(await claimReadingDeliveryAttemptBody("sub_1", "jti-first", body)).toEqual(body);
      expect(
        await claimReadingDeliveryAttemptBody("sub_1", "jti-first", { subject: "x", html: "y" }),
      ).toEqual(body);
      expect(await claimReadingDeliveryAttempt("sub_1", attempt)).toEqual({ ...attempt, body });
    });

    it("stores nothing for a different attempt", async () => {
      await createSubmission(BASE_INPUT);
      await claimReadingDeliveryAttempt("sub_1", attempt);

      expect(await claimReadingDeliveryAttemptBody("sub_1", "jti-other", body)).toBeNull();
      expect((await claimReadingDeliveryAttempt("sub_1", attempt))?.body).toBeNull();
    });

    it("clears the body with the attempt", async () => {
      await createSubmission(BASE_INPUT);
      await claimReadingDeliveryAttempt("sub_1", attempt);
      await claimReadingDeliveryAttemptBody("sub_1", "jti-first", body);
      await clearReadingDeliveryAttempt("sub_1");

      expect((await claimReadingDeliveryAttempt("sub_1", attempt))?.body).toBeNull();
    });

    it("drops the body and keeps the attempt once the send is recorded", async () => {
      await createSubmission(BASE_INPUT);
      await claimReadingDeliveryAttempt("sub_1", attempt);
      await claimReadingDeliveryAttemptBody("sub_1", "jti-first", body);
      await markReadingDeliverySentIfUnrecorded(
        "sub_1",
        { deliveredAt: attempt.attemptedAt, voiceNoteUrl: "v", pdfUrl: "p" },
        { type: "reading_delivery", sentAt: attempt.attemptedAt, resendId: "msg_1" },
      );

      expect(await claimReadingDeliveryAttempt("sub_1", attempt)).toEqual({ ...attempt, body: null });
    });
  });

  describe("email failures", () => {
    it("starts every submission with no failures", async () => {
      await createSubmission(BASE_INPUT);

      expect((await findSubmissionById("sub_1"))?.emailFailures).toEqual([]);
    });

    it("numbers open failures per email type and returns the full list", async () => {
      await createSubmission(BASE_INPUT);
      await appendEmailFailure("sub_1", failure());
      await appendEmailFailure("sub_1", failure({ emailType: "order_confirmation" }));
      const list = await appendEmailFailure("sub_1", failure({ kind: "bounced" }));

      expect(list?.map((entry) => [entry.emailType, entry.kind, entry.attemptNumber])).toEqual([
        ["reading_delivery", "send_error", 1],
        ["order_confirmation", "send_error", 1],
        ["reading_delivery", "bounced", 2],
      ]);
      expect(list?.[0]).toEqual({ ...failure(), attemptNumber: 1, resolvedAt: null });
      expect((await findSubmissionById("sub_1"))?.emailFailures).toEqual(list);
    });

    it("returns null for a missing submission", async () => {
      expect(await appendEmailFailure("sub_missing", failure())).toBeNull();
    });

    it("a recorded send resolves only that type's open failures and keeps their order", async () => {
      await createSubmission(BASE_INPUT);
      await appendEmailFailure("sub_1", failure());
      await appendEmailFailure("sub_1", failure({ emailType: "order_confirmation" }));
      await appendEmailFailure("sub_1", failure({ kind: "bounced" }));

      const list = await appendEmailFired("sub_1", {
        type: "reading_delivery",
        sentAt: "2026-04-30T09:00:00.000Z",
        resendId: "msg_2",
      });

      expect(list?.map((entry) => [entry.emailType, entry.kind, entry.resolvedAt])).toEqual([
        ["reading_delivery", "send_error", "2026-04-30T09:00:00.000Z"],
        ["order_confirmation", "send_error", null],
        ["reading_delivery", "bounced", "2026-04-30T09:00:00.000Z"],
      ]);
      expect(list?.[0]?.attemptNumber).toBe(1);
    });

    it("appendEmailFired sets delivered_at when asked", async () => {
      await createSubmission(BASE_INPUT);
      await appendEmailFired(
        "sub_1",
        { type: "reading_delivery", sentAt: "2026-04-30T09:00:00.000Z", resendId: "msg_2" },
        { deliveredAt: "2026-04-30T09:00:00.000Z" },
      );

      expect((await findSubmissionById("sub_1"))?.deliveredAt).toBe("2026-04-30T09:00:00.000Z");
    });

    it("the recorded reading delivery and the dry-run delivery resolve reading delivery failures", async () => {
      const delivery = { deliveredAt: "2026-04-30T09:00:00.000Z", voiceNoteUrl: "v", pdfUrl: "p" };
      await createSubmission(BASE_INPUT);
      await createSubmission({ ...BASE_INPUT, id: "sub_2" });
      await appendEmailFailure("sub_1", failure());
      await appendEmailFailure("sub_2", failure());

      const sent = await markReadingDeliverySentIfUnrecorded("sub_1", delivery, {
        type: "reading_delivery",
        sentAt: delivery.deliveredAt,
        resendId: "msg_1",
      });
      const dryRun = await markSubmissionDeliveredIfUnset("sub_2", delivery);

      expect(sent?.[0]?.resolvedAt).toBe(delivery.deliveredAt);
      expect(dryRun?.[0]?.resolvedAt).toBe(delivery.deliveredAt);
    });

    it("restarts the attempt number after a resolution", async () => {
      await createSubmission(BASE_INPUT);
      await appendEmailFailure("sub_1", failure());
      await appendEmailFired("sub_1", {
        type: "reading_delivery",
        sentAt: "2026-04-30T09:00:00.000Z",
        resendId: "msg_2",
      });
      const list = await appendEmailFailure("sub_1", failure({ kind: "bounced" }));

      expect(list?.at(-1)?.attemptNumber).toBe(1);
    });

    it("resolves an open order confirmation failure when the gift confirmation is recorded", async () => {
      await createSubmission(BASE_INPUT);
      await appendEmailFailure("sub_1", failure({ emailType: "order_confirmation" }));

      const list = await appendEmailFired("sub_1", {
        type: "gift_recipient_confirmation",
        sentAt: "2026-04-29T13:00:00.000Z",
        resendId: "msg_gift",
      });

      expect(list?.[0]?.resolvedAt).toBe("2026-04-29T13:00:00.000Z");
    });
  });

  describe("listPaidSubmissionsForEmail with a paid window and no failure", () => {
    const options = {
      paidAfter: "2026-04-20T00:00:00.000Z",
      paidBefore: "2026-04-29T11:00:00.000Z",
      withoutFailureOf: "order_confirmation",
    } as const;

    async function paidAt(id: string, paidAtIso: string) {
      await createSubmission({ ...BASE_INPUT, id });
      await markSubmissionPaid(id, {
        stripeEventId: `evt_${id}`,
        stripeSessionId: `cs_${id}`,
        paidAt: paidAtIso,
        amountPaidCents: 17900,
        amountPaidCurrency: "usd",
      });
    }

    it("lists paid submissions in the window with no confirmation and no confirmation failure", async () => {
      await paidAt("sub_missing", "2026-04-28T10:00:00.000Z");
      await paidAt("sub_sent", "2026-04-28T10:00:00.000Z");
      await appendEmailFired("sub_sent", {
        type: "order_confirmation",
        sentAt: "2026-04-28T10:00:05.000Z",
        resendId: "msg_1",
      });
      await paidAt("sub_flagged", "2026-04-28T10:00:00.000Z");
      await appendEmailFailure("sub_flagged", failure({ emailType: "order_confirmation" }));
      await paidAt("sub_other_failure", "2026-04-28T10:00:00.000Z");
      await appendEmailFailure("sub_other_failure", failure());
      await paidAt("sub_gift_sent", "2026-04-28T10:00:00.000Z");
      await appendEmailFired("sub_gift_sent", {
        type: "gift_recipient_confirmation",
        sentAt: "2026-04-28T10:00:05.000Z",
        resendId: "msg_gift",
      });
      await paidAt("sub_too_recent", "2026-04-29T11:30:00.000Z");
      await paidAt("sub_too_old", "2026-04-10T10:00:00.000Z");
      await createSubmission({ ...BASE_INPUT, id: "sub_pending" });

      const ids = (await listPaidSubmissionsForEmail("order_confirmation", options)).map(
        (row) => row._id,
      );

      expect(ids.sort()).toEqual(["sub_missing", "sub_other_failure"]);
    });
  });

  it("findSubmissionByResendId finds the submission whose emailsFired holds the id", async () => {
    await createSubmission(BASE_INPUT);
    await appendEmailFired("sub_1", {
      type: "reading_delivery",
      sentAt: "2026-04-29T12:00:00.000Z",
      resendId: "msg_abc",
    });

    expect((await findSubmissionByResendId("msg_abc"))?._id).toBe("sub_1");
    expect(await findSubmissionByResendId("msg_ab")).toBeNull();
  });

  it("setSubmissionEmailAndRecipient changes the address and user and clears the delivery attempt", async () => {
    await createSubmission(BASE_INPUT);
    await claimReadingDeliveryAttempt("sub_1", {
      attemptedAt: "2026-04-29T12:00:00.000Z",
      jti: "jti-first",
    });
    await setSubmissionEmailAndRecipient("sub_1", {
      email: "ada@example.org",
      recipientUserId: "user_new",
    });
    const fresh = { attemptedAt: "2026-04-30T12:00:00.000Z", jti: "jti-fresh" };

    const record = await findSubmissionById("sub_1");
    expect(record?.email).toBe("ada@example.org");
    expect(record?.recipientUserId).toBe("user_new");
    expect(await claimReadingDeliveryAttempt("sub_1", fresh)).toEqual({ ...fresh, body: null });
  });

  describe("gift submissions", () => {
    const REDEEMED_AT = "2026-10-04T09:30:00.000Z";

    beforeEach(() => {
      vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
    });

    function giftInput(giftCodeId: string, id = "sub_gift"): CreateSubmissionInput {
      return {
        ...BASE_INPUT,
        id,
        status: "paid",
        readingSlug: "birth-chart",
        paidAt: REDEEMED_AT,
        coolingOffAcknowledgedAt: REDEEMED_AT,
        recipientUserId: "user_anna",
        giftCodeId,
      };
    }

    async function activeGift(): Promise<string> {
      const giftId = await createTestGift();
      await forceGiftStatus(giftId, "active");
      return giftId;
    }

    it("builds the plain insert with every new column empty when there is no gift", async () => {
      const statement = buildCreateSubmissionStatement(BASE_INPUT);

      expect(statement.sql).toMatch(/VALUES \(/);
      expect(statement.sql).not.toMatch(/gift_codes/);
      expect(statement.params?.slice(-3)).toEqual([null, null, null]);
      await createSubmission(BASE_INPUT);
      expect((await findSubmissionById("sub_1"))?.giftCodeId).toBeNull();
    });

    it("inserts nothing unless the gift row names the submission", async () => {
      const giftId = await activeGift();

      await dbBatch([buildCreateSubmissionStatement(giftInput(giftId))]);

      expect(await hasGiftSubmission("sub_gift", giftId)).toBe(false);
    });

    it("inserts the paid gift submission in the same batch that redeems the gift", async () => {
      const giftId = await activeGift();

      await dbBatch([
        buildRedeemGiftStatement({
          giftId,
          readingSlug: "birth-chart",
          submissionId: "sub_gift",
          redeemedAt: REDEEMED_AT,
        }),
        buildCreateSubmissionStatement(giftInput(giftId)),
      ]);

      expect(await hasGiftSubmission("sub_gift", giftId)).toBe(true);
      expect(await findSubmissionById("sub_gift")).toMatchObject({
        status: "paid",
        paidAt: REDEEMED_AT,
        recipientUserId: "user_anna",
        giftCodeId: giftId,
      });
      expect(await hasGiftSubmission("sub_gift", "another-gift")).toBe(false);
    });

    it("lists a paid gift submission with its recipient user for reading delivery", async () => {
      const giftId = await activeGift();
      await dbBatch([
        buildRedeemGiftStatement({
          giftId,
          readingSlug: "birth-chart",
          submissionId: "sub_gift",
          redeemedAt: REDEEMED_AT,
        }),
        buildCreateSubmissionStatement(giftInput(giftId)),
      ]);

      const due = await listPaidSubmissionsForEmail("reading_delivery", {});

      expect(due.map((row) => [row._id, row.recipientUserId])).toEqual([["sub_gift", "user_anna"]]);
    });

    it("finds the recipient thank-you for a paid gift submission only", async () => {
      const giftId = await activeGift();
      await dbBatch([
        buildRedeemGiftStatement({
          giftId,
          readingSlug: "birth-chart",
          submissionId: "sub_gift",
          redeemedAt: REDEEMED_AT,
        }),
        buildCreateSubmissionStatement(giftInput(giftId)),
      ]);
      await createSubmission({ ...BASE_INPUT, status: "paid" });

      expect(await findGiftRecipientThankYou("sub_gift")).toEqual({
        readingSlug: "birth-chart",
        readingName: "Soul Blueprint",
        responses: BASE_INPUT.responses,
        buyerFirstName: "Marguerite",
      });
      expect(await findGiftRecipientThankYou("sub_1")).toBeNull();
      expect(await findGiftRecipientThankYou("sub_unknown")).toBeNull();
    });
  });
});
