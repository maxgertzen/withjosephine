import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./persistence/sqlClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./persistence/sqlClient")>();
  return { ...actual, dbBatch: vi.fn(actual.dbBatch) };
});

vi.mock("../r2", () => ({
  deleteObject: vi.fn(),
}));

vi.mock("./persistence/sanityMirror", () => ({
  mirrorAppendEmailFired: vi.fn(),
  mirrorMarkSubmissionListened: vi.fn(),
  mirrorSubmissionCreate: vi.fn(),
  mirrorSubmissionDelete: vi.fn(),
  mirrorSubmissionPatch: vi.fn(),
  mirrorUnsetPhotoKey: vi.fn(),
}));

import { deleteObject } from "../r2";
import * as mirror from "./persistence/sanityMirror";
import { dbBatch } from "./persistence/sqlClient";
import {
  appendEmailFired,
  buildSubmissionContext,
  createSubmission,
  deleteSubmissionAndPhoto,
  findSubmissionById,
  markSubmissionExpired,
  markSubmissionPaid,
  recordReadingDeliverySent,
  scheduleListenedAtMirror,
  scrubSubmissionPhoto,
  type SubmissionRecord,
} from "./submissions";

const mockDeleteObject = vi.mocked(deleteObject);
const mockMirrorCreate = vi.mocked(mirror.mirrorSubmissionCreate);
const mockMirrorPatch = vi.mocked(mirror.mirrorSubmissionPatch);
const mockMirrorAppend = vi.mocked(mirror.mirrorAppendEmailFired);
const mockMirrorDelete = vi.mocked(mirror.mirrorSubmissionDelete);
const mockMirrorUnsetPhoto = vi.mocked(mirror.mirrorUnsetPhotoKey);
const mockMirrorMarkListened = vi.mocked(mirror.mirrorMarkSubmissionListened);

const SUBMISSION_INPUT = {
  id: "sub_1",
  email: "ada@example.com",
  status: "pending" as const,
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
  consentLabel: "I acknowledge",
  photoR2Key: "submissions/sub_1/photo.jpg",
  createdAt: "2026-04-20T10:00:00Z",
  consentAcknowledgedAt: "2026-04-20T10:00:00Z",
  ipAddress: "1.2.3.4",
};

const PAID = {
  stripeEventId: "evt_1",
  stripeSessionId: "cs_1",
  paidAt: "2026-04-21T10:00:00Z",
  amountPaidCents: 12900,
  amountPaidCurrency: "usd",
};

beforeEach(() => {
  vi.mocked(dbBatch).mockReset();
  mockDeleteObject.mockReset().mockResolvedValue(undefined);
  mockMirrorCreate.mockReset().mockResolvedValue(undefined);
  mockMirrorPatch.mockReset().mockResolvedValue(undefined);
  mockMirrorAppend.mockReset().mockResolvedValue(undefined);
  mockMirrorDelete.mockReset().mockResolvedValue(undefined);
  mockMirrorUnsetPhoto.mockReset().mockResolvedValue(undefined);
  mockMirrorMarkListened.mockReset().mockResolvedValue(undefined);
});

async function flushFireAndForget() {
  // void mirror calls fire microtasks; await one tick so they settle.
  await Promise.resolve();
  await Promise.resolve();
}

describe("submissions wrapper (D1 source + Sanity mirror)", () => {
  it("createSubmission writes to D1 and triggers Sanity mirror create", async () => {
    await createSubmission(SUBMISSION_INPUT);
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?._id).toBe("sub_1");
    expect(mockMirrorCreate).toHaveBeenCalledOnce();
    const [input, consent] = mockMirrorCreate.mock.calls[0]!;
    expect(input.id).toBe("sub_1");
    expect(input.email).toBe("ada@example.com");
    expect(consent.consentAcknowledgedAt).toBe("2026-04-20T10:00:00Z");
    expect(consent.ipAddress).toBe("1.2.3.4");
    expect(consent.art6AcknowledgedAt).toBeNull();
    expect(consent.art9AcknowledgedAt).toBeNull();
  });

  it("markSubmissionPaid updates D1 and triggers mirror patch", async () => {
    await createSubmission(SUBMISSION_INPUT);
    await markSubmissionPaid("sub_1", PAID);
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?.status).toBe("paid");
    expect(mockMirrorPatch).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ status: "paid", paidAt: "2026-04-21T10:00:00Z" }),
    );
  });

  it("markSubmissionPaid lets one of two concurrent sessions win and mirrors only the winner", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const paidBy = (stripeSessionId: string) =>
      markSubmissionPaid(
        "sub_1",
        { ...PAID, stripeEventId: `evt_${stripeSessionId}`, stripeSessionId },
        {
          submissionId: "sub_1",
          userId: null,
          email: "ada@example.com",
          paidAt: "2026-04-21T10:00:00Z",
          amountPaidCents: 12900,
          amountPaidCurrency: "usd",
          country: null,
          stripeSessionId,
        },
      );

    const results = await Promise.all([paidBy("cs_1"), paidBy("cs_2")]);
    await flushFireAndForget();

    expect([...results].sort()).toEqual(["marked", "paid_by_another_session"]);
    const winner = results[0] === "marked" ? "cs_1" : "cs_2";
    expect((await findSubmissionById("sub_1"))?.stripeSessionId).toBe(winner);
    expect(mockMirrorPatch).toHaveBeenCalledOnce();
    expect(mockMirrorPatch).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ stripeSessionId: winner }),
    );
  });

  it("markSubmissionPaid reports not_marked when the submission row is gone", async () => {
    expect(
      await markSubmissionPaid("sub_missing", PAID),
    ).toBe("not_marked");
    await flushFireAndForget();
    expect(mockMirrorPatch).not.toHaveBeenCalled();
  });

  it("markSubmissionPaid reports marked again when the same session is applied twice", async () => {
    await createSubmission(SUBMISSION_INPUT);

    expect(await markSubmissionPaid("sub_1", PAID)).toBe("marked");
    expect(await markSubmissionPaid("sub_1", PAID)).toBe("marked");
  });

  it.each([
    ["the webhook", "evt_1", "reconcile:cs_1"],
    ["reconcile", "reconcile:cs_1", "evt_1"],
  ])(
    "markSubmissionPaid: when %s marks the session paid first, the other event gets already_marked and the mirror is patched once",
    async (_first, winnerEventId, loserEventId) => {
      await createSubmission(SUBMISSION_INPUT);

      expect(await markSubmissionPaid("sub_1", { ...PAID, stripeEventId: winnerEventId })).toBe(
        "marked",
      );
      expect(await markSubmissionPaid("sub_1", { ...PAID, stripeEventId: loserEventId })).toBe(
        "already_marked",
      );
      await flushFireAndForget();

      expect((await findSubmissionById("sub_1"))?.stripeEventId).toBe(winnerEventId);
      expect(mockMirrorPatch).toHaveBeenCalledExactlyOnceWith(
        "sub_1",
        expect.objectContaining({ stripeEventId: winnerEventId }),
      );
    },
  );

  it("markSubmissionPaid trusts the row it reads back when the batch reports no rows written", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const actualDbBatch = vi.mocked(dbBatch).getMockImplementation()!;
    vi.mocked(dbBatch).mockImplementationOnce(async (statements) =>
      (await actualDbBatch(statements)).map(() => ({ rowsWritten: 0 })),
    );

    expect(await markSubmissionPaid("sub_1", PAID)).toBe("marked");
    await flushFireAndForget();
    expect(mockMirrorPatch).toHaveBeenCalledOnce();
  });

  it("markSubmissionExpired leaves a paid submission and its Sanity mirror untouched", async () => {
    await createSubmission(SUBMISSION_INPUT);
    await markSubmissionPaid("sub_1", PAID);
    await flushFireAndForget();
    mockMirrorPatch.mockClear();

    await markSubmissionExpired("sub_1", { expiredAt: "2026-04-22T10:00:00Z" });
    await flushFireAndForget();

    expect((await findSubmissionById("sub_1"))?.status).toBe("paid");
    expect(mockMirrorPatch).not.toHaveBeenCalled();
  });

  it("appendEmailFired writes to D1 and triggers mirror append", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const entry = {
      type: "order_confirmation" as const,
      sentAt: "2026-04-21T10:00:00Z",
      resendId: "msg_1",
    };
    await appendEmailFired("sub_1", entry);
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?.emailsFired).toEqual([entry]);
    expect(mockMirrorAppend).toHaveBeenCalledWith("sub_1", entry, {});
  });

  it("recordReadingDeliverySent writes delivered_at and the reading_delivery entry with one timestamp and mirrors them together", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const delivery = {
      deliveredAt: "2026-04-29T12:00:07Z",
      voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
      pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
    };
    await recordReadingDeliverySent("sub_1", delivery, "msg_d7");
    await flushFireAndForget();

    const deliveryEntry = { type: "reading_delivery", sentAt: delivery.deliveredAt, resendId: "msg_d7" };
    const record = await findSubmissionById("sub_1");
    expect(record).toMatchObject({ ...delivery, emailsFired: [deliveryEntry] });
    expect(mockMirrorAppend).toHaveBeenCalledWith("sub_1", deliveryEntry, {
      deliveredAt: delivery.deliveredAt,
    });
  });

  it("recordReadingDeliverySent a second time for the same submission writes and mirrors nothing", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const delivery = {
      deliveredAt: "2026-04-29T12:00:07Z",
      voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
      pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
    };
    await recordReadingDeliverySent("sub_1", delivery, "msg_d7");
    await recordReadingDeliverySent("sub_1", { ...delivery, deliveredAt: "2026-04-29T18:00:00Z" }, "msg_d7");
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?.emailsFired).toHaveLength(1);
    expect(record?.deliveredAt).toBe(delivery.deliveredAt);
    expect(mockMirrorAppend).toHaveBeenCalledTimes(1);
  });

  it("deleteSubmissionAndPhoto removes the submission and the R2 photo", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const result = await deleteSubmissionAndPhoto({
      _id: "sub_1",
      photoR2Key: "submissions/sub_1/photo.jpg",
    });
    await flushFireAndForget();

    expect(result).toEqual({ photoDeleted: true });
    expect(mockDeleteObject).toHaveBeenCalledWith("submissions/sub_1/photo.jpg");
    expect(await findSubmissionById("sub_1")).toBeNull();
    expect(mockMirrorDelete).toHaveBeenCalledWith("sub_1");
  });

  it("deleteSubmissionAndPhoto still removes the submission when R2 fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await createSubmission(SUBMISSION_INPUT);
    mockDeleteObject.mockRejectedValueOnce(new Error("R2 down"));

    const result = await deleteSubmissionAndPhoto({
      _id: "sub_1",
      photoR2Key: "submissions/sub_1/photo.jpg",
    });
    await flushFireAndForget();

    expect(result).toEqual({ photoDeleted: false });
    expect(await findSubmissionById("sub_1")).toBeNull();
  });

  it("scrubSubmissionPhoto deletes R2 + clears photoR2Key + mirrors", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const result = await scrubSubmissionPhoto({
      _id: "sub_1",
      photoR2Key: "submissions/sub_1/photo.jpg",
    });
    await flushFireAndForget();

    expect(result).toBe(true);
    const record = await findSubmissionById("sub_1");
    expect(record?.photoR2Key).toBeUndefined();
    expect(mockMirrorUnsetPhoto).toHaveBeenCalledWith("sub_1");
  });

  it("scrubSubmissionPhoto returns false when no key", async () => {
    const result = await scrubSubmissionPhoto({ _id: "sub_x" });
    expect(result).toBe(false);
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it("scheduleListenedAtMirror delegates to the Sanity setIfMissing mirror", async () => {
    scheduleListenedAtMirror("sub_42", "2026-05-10T12:00:00Z");
    await flushFireAndForget();
    expect(mockMirrorMarkListened).toHaveBeenCalledWith("sub_42", "2026-05-10T12:00:00Z");
  });
});

describe("buildSubmissionContext", () => {
  const SUBMISSION: SubmissionRecord = {
    _id: "sub_1",
    status: "paid",
    email: "client@example.com",
    responses: [
      {
        fieldKey: "first_name",
        fieldLabelSnapshot: "First name",
        fieldType: "shortText",
        value: "Ada",
      },
    ],
    photoR2Key: "submissions/sub_1/photo.jpg",
    createdAt: "2026-04-20T10:00:00Z",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: null,
    amountPaidCurrency: null,
    recipientUserId: null,
  };

  it("builds Resend context with photo URL and firstName extracted", () => {
    const ctx = buildSubmissionContext(SUBMISSION);
    expect(ctx.id).toBe("sub_1");
    expect(ctx.firstName).toBe("Ada");
    expect(ctx.readingName).toBe("Soul Blueprint");
    expect(ctx.photoUrl).toBe("https://images.withjosephine.com/submissions/sub_1/photo.jpg");
  });

  it("falls back to legal_full_name first token", () => {
    const ctx = buildSubmissionContext({
      ...SUBMISSION,
      responses: [
        {
          fieldKey: "legal_full_name",
          fieldLabelSnapshot: "Legal full name",
          fieldType: "shortText",
          value: "Ada Lovelace",
        },
      ],
    });
    expect(ctx.firstName).toBe("Ada");
  });

  it("falls back to 'there' when no name response present", () => {
    const ctx = buildSubmissionContext({ ...SUBMISSION, responses: [] });
    expect(ctx.firstName).toBe("there");
  });

  it("returns null photoUrl when no R2 key", () => {
    const ctx = buildSubmissionContext({ ...SUBMISSION, photoR2Key: undefined });
    expect(ctx.photoUrl).toBeNull();
  });

  it("falls back to default reading copy when reading is null", () => {
    const ctx = buildSubmissionContext({ ...SUBMISSION, reading: null });
    expect(ctx.readingName).toBe("your reading");
  });
});
