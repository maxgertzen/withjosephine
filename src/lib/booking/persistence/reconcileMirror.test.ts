import { describe, expect, it } from "vitest";

import type { EmailFiredEntry, SubmissionRecord } from "../submissions";
import { diffSubmission, type SanityMirrorSnapshot } from "./reconcileMirror";

function makeD1(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub-1",
    email: "test@example.com",
    status: "pending",
    responses: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    emailsFired: [],
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$129" },
    amountPaidCents: null,
    amountPaidCurrency: null,
    ...overrides,
  };
}

function makeMatchingSanity(d1: SubmissionRecord): SanityMirrorSnapshot {
  return {
    _id: d1._id,
    status: d1.status,
    paidAt: d1.paidAt,
    expiredAt: d1.expiredAt,
    amountPaidCents: d1.amountPaidCents,
    amountPaidCurrency: d1.amountPaidCurrency,
    emailsFired: d1.emailsFired,
  };
}

function makeEmail(type: EmailFiredEntry["type"], sentAt: string): EmailFiredEntry {
  return { type, sentAt, resendId: null };
}

describe("diffSubmission", () => {
  it("returns 'create' when Sanity has no doc", () => {
    expect(diffSubmission(makeD1(), null)).toEqual({ kind: "create" });
  });

  it("returns 'skip' when D1 and Sanity match on compared fields", () => {
    const d1 = makeD1({ status: "paid", paidAt: "2026-05-02T00:00:00.000Z" });
    expect(diffSubmission(d1, makeMatchingSanity(d1))).toEqual({ kind: "skip" });
  });

  it("returns a patch when status differs", () => {
    const d1 = makeD1({ status: "paid", paidAt: "2026-05-02T00:00:00.000Z" });
    const sanity: SanityMirrorSnapshot = { _id: "sub-1", status: "pending" };
    const action = diffSubmission(d1, sanity);
    expect(action.kind).toBe("patch");
    if (action.kind !== "patch") return;
    expect(action.patch.status).toBe("paid");
    expect(action.patch.paidAt).toBe("2026-05-02T00:00:00.000Z");
  });

  it("treats null and undefined as equivalent on amountPaidCents", () => {
    const d1 = makeD1({ amountPaidCents: null });
    const sanity = makeMatchingSanity(d1);
    sanity.amountPaidCents = undefined;
    expect(diffSubmission(d1, sanity)).toEqual({ kind: "skip" });
  });

  it("identifies missing email-fired entries", () => {
    const e1 = makeEmail("order_confirmation", "2026-05-01T00:00:00.000Z");
    const e2 = makeEmail("day2", "2026-05-03T00:00:00.000Z");
    const d1 = makeD1({ emailsFired: [e1, e2] });
    const sanity = makeMatchingSanity(d1);
    sanity.emailsFired = [e1];
    const action = diffSubmission(d1, sanity);
    expect(action.kind).toBe("patch");
    if (action.kind !== "patch") return;
    expect(action.missingEmails).toEqual([e2]);
  });

  it("returns 'skip' when emailsFired arrays match by (type, sentAt)", () => {
    const e1 = makeEmail("order_confirmation", "2026-05-01T00:00:00.000Z");
    const d1 = makeD1({ emailsFired: [e1] });
    expect(diffSubmission(d1, makeMatchingSanity(d1))).toEqual({ kind: "skip" });
  });
});
