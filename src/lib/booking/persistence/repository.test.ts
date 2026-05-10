import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendEmailFired,
  createSubmission,
  type CreateSubmissionInput,
  deleteSubmission,
  findSubmissionById,
  listAllReferencedPhotoKeys,
  listPaidSubmissionsForEmail,
  listSubmissionsByRecipientUserId,
  listSubmissionsByStatusOlderThan,
  markSubmissionDelivered,
  markSubmissionExpired,
  markSubmissionPaid,
  setSubmissionRecipientUser,
  unsetPhotoR2Key,
} from "./repository";

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

  it("marks expired with optional Stripe event id", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionExpired("sub_1", { expiredAt: "2026-04-22T10:00:00Z" });
    expect((await findSubmissionById("sub_1"))?.status).toBe("expired");
  });

  it("appends emailsFired entries idempotently per call", async () => {
    await createSubmission(BASE_INPUT);
    await appendEmailFired("sub_1", {
      type: "order_confirmation",
      sentAt: "2026-04-21T10:00:00Z",
      resendId: "msg_1",
    });
    await appendEmailFired("sub_1", {
      type: "day2",
      sentAt: "2026-04-23T10:00:00Z",
      resendId: "msg_2",
    });
    const record = await findSubmissionById("sub_1");
    expect(record?.emailsFired).toHaveLength(2);
    expect(record?.emailsFired?.[0]?.type).toBe("order_confirmation");
    expect(record?.emailsFired?.[1]?.type).toBe("day2");
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

    let due = await listPaidSubmissionsForEmail("day2", { paidBefore: "2026-04-30T00:00:00Z" });
    expect(due.map((r) => r._id)).toEqual(["sub_1"]);

    await appendEmailFired("sub_1", {
      type: "day2",
      sentAt: "2026-04-22T10:00:00Z",
      resendId: "msg_d2",
    });

    due = await listPaidSubmissionsForEmail("day2", { paidBefore: "2026-04-30T00:00:00Z" });
    expect(due).toEqual([]);
  });

  it("markSubmissionDelivered writes deliveredAt + URL strings to D1", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-20T10:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });
    const { markSubmissionDelivered } = await import("./repository");
    await markSubmissionDelivered("sub_1", {
      deliveredAt: "2026-04-27T10:00:00Z",
      voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
      pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
    });
    const record = await findSubmissionById("sub_1");
    expect(record?.deliveredAt).toBe("2026-04-27T10:00:00Z");
    expect(record?.voiceNoteUrl).toBe("https://cdn.sanity.io/files/.../voice.m4a");
    expect(record?.pdfUrl).toBe("https://cdn.sanity.io/files/.../reading.pdf");
  });

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
      await markSubmissionDelivered(id, {
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
});
