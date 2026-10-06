import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./persistence/sanityMirror", () => ({
  mirrorSubmissionCreate: vi.fn(async () => undefined),
  mirrorSubmissionPatch: vi.fn(async () => undefined),
}));

import { findUserByEmail, findUserById, getOrCreateUser } from "@/lib/auth/users";

import { correctCustomerEmail } from "./emailCorrection";
import {
  insertFinancialRecord,
  setSubmissionRecipientUser,
} from "./persistence/repository";
import { mirrorSubmissionPatch } from "./persistence/sanityMirror";
import { dbQuery } from "./persistence/sqlClient";
import { createSubmission, findSubmissionById, type SubmissionRecord } from "./submissions";

const BAD_ADDRESS = "ada@exmaple.com";
const GOOD_ADDRESS = "ada@example.com";

async function paidSubmission(id: string, email: string, userId: string): Promise<SubmissionRecord> {
  await createSubmission({
    id,
    email,
    status: "paid",
    readingSlug: "soul-blueprint",
    readingName: "Soul Blueprint",
    readingPriceDisplay: "$179",
    responses: [
      { fieldKey: "first_name", fieldLabelSnapshot: "First name", fieldType: "shortText", value: "Ada" },
    ],
    consentLabel: null,
    photoR2Key: null,
    createdAt: "2026-09-20T00:00:00.000Z",
    consentAcknowledgedAt: "2026-09-20T00:00:00.000Z",
    ipAddress: null,
  });
  await setSubmissionRecipientUser(id, userId);
  const record = await findSubmissionById(id);
  if (!record) throw new Error(`missing ${id}`);
  return record;
}

beforeEach(() => {
  vi.stubEnv("BOOKING_DB_DRIVER", "sqlite");
  vi.stubEnv("BOOKING_DB_PATH", ":memory:");
  vi.mocked(mirrorSubmissionPatch).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("correctCustomerEmail", () => {
  it("renames the customer's user when this is their only reading", async () => {
    const { userId } = await getOrCreateUser({ email: BAD_ADDRESS });
    const submission = await paidSubmission("sub_1", BAD_ADDRESS, userId);

    const corrected = await correctCustomerEmail(submission, " Ada@Example.com ");

    expect(corrected).toMatchObject({ email: GOOD_ADDRESS, recipientUserId: userId });
    expect(await findUserById(userId)).toEqual({ id: userId, email: GOOD_ADDRESS });
    expect(await findSubmissionById("sub_1")).toMatchObject({
      email: GOOD_ADDRESS,
      recipientUserId: userId,
    });
    expect(mirrorSubmissionPatch).toHaveBeenCalledWith("sub_1", {
      email: GOOD_ADDRESS,
      recipientUserId: userId,
    });
  });

  it("moves the reading to the existing user who already has the corrected address", async () => {
    const { userId: badUserId } = await getOrCreateUser({ email: BAD_ADDRESS });
    const { userId: existingUserId } = await getOrCreateUser({ email: GOOD_ADDRESS });
    const submission = await paidSubmission("sub_1", BAD_ADDRESS, badUserId);

    await correctCustomerEmail(submission, GOOD_ADDRESS);

    expect((await findSubmissionById("sub_1"))?.recipientUserId).toBe(existingUserId);
    expect(await findUserById(badUserId)).toEqual({ id: badUserId, email: BAD_ADDRESS });
  });

  it("gives the reading a new user when the old user has other readings", async () => {
    const { userId: sharedUserId } = await getOrCreateUser({ email: BAD_ADDRESS });
    await paidSubmission("sub_other", BAD_ADDRESS, sharedUserId);
    const submission = await paidSubmission("sub_1", BAD_ADDRESS, sharedUserId);

    await correctCustomerEmail(submission, GOOD_ADDRESS);

    const newUser = await findUserByEmail(GOOD_ADDRESS);
    expect(newUser?.id).not.toBe(sharedUserId);
    expect((await findSubmissionById("sub_1"))?.recipientUserId).toBe(newUser?.id);
    expect((await findSubmissionById("sub_other"))?.recipientUserId).toBe(sharedUserId);
    expect(await findUserById(sharedUserId)).toEqual({ id: sharedUserId, email: BAD_ADDRESS });
  });

  it("leaves the financial record with the address that paid", async () => {
    const { userId } = await getOrCreateUser({ email: BAD_ADDRESS });
    const submission = await paidSubmission("sub_1", BAD_ADDRESS, userId);
    await insertFinancialRecord({
      submissionId: "sub_1",
      userId,
      email: BAD_ADDRESS,
      paidAt: "2026-09-20T00:05:00.000Z",
      amountPaidCents: 17900,
      amountPaidCurrency: "usd",
      country: null,
      stripeSessionId: "cs_1",
      retainedUntil: "2032-09-20T00:05:00.000Z",
    });

    await correctCustomerEmail(submission, GOOD_ADDRESS);

    const rows = await dbQuery<{ email: string }>(
      `SELECT email FROM financial_records WHERE submission_id = ?`,
      ["sub_1"],
    );
    expect(rows).toEqual([{ email: BAD_ADDRESS }]);
  });
});
