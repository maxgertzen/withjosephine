import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendEmailFired,
  createSubmission,
  type CreateSubmissionInput,
  deleteSubmission,
  findSubmissionById,
  listAllReferencedPhotoKeys,
  listPaidSubmissionsForEmail,
  listSubmissionsByStatusOlderThan,
  markSubmissionExpired,
  markSubmissionPaid,
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
  clientReferenceId: "sub_1",
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

  it("listPaidSubmissionsForEmail respects requireDeliveredAt and requireMissingDeliveredAt", async () => {
    await createSubmission(BASE_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-20T10:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });

    expect(
      await listPaidSubmissionsForEmail("day7", { requireDeliveredAt: true }),
    ).toEqual([]);
    expect(
      (await listPaidSubmissionsForEmail("day7-overdue-alert", { requireMissingDeliveredAt: true }))
        .length,
    ).toBe(1);
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
});
