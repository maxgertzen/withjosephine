import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMirrorGiftSubmission = vi.hoisted(() =>
  vi.fn<(giftId: string) => Promise<void>>(async () => {}),
);

vi.mock("./giftSubmissionMirror", () => ({ mirrorGiftSubmission: mockMirrorGiftSubmission }));
vi.mock("@sentry/cloudflare", () => ({ captureMessage: vi.fn() }));

import * as Sentry from "@sentry/cloudflare";

import { dbExec } from "@/lib/booking/persistence/sqlClient";
import { captureConsole } from "@/test/captureConsole";
import { createTestGift, forceGiftStatus } from "@/test/fixtures/gift";

import {
  recordGiftEmailFailure,
  recordUnsentGiftEmail,
  releaseBouncedGiftSend,
} from "./giftEmailFailures";
import { appendGiftEmailFired, findGiftById, recordGiftEmailResent } from "./gifts";

const BOUNCE = {
  kind: "bounced" as const,
  errorMessage: "550 <anna@example.com>: mailbox unknown",
  resendId: "msg_gs_1",
};

async function activeGift(): Promise<string> {
  const giftId = await createTestGift();
  await forceGiftStatus(giftId, "active");
  return giftId;
}

async function setSends(giftId: string, sendCount: number, resendIds: string[]): Promise<void> {
  const emailsFired = resendIds.map((resendId, index) => ({
    type: "gift_send",
    sentAt: `2026-10-04T0${index + 1}:00:00.000Z`,
    resendId,
  }));
  await dbExec(
    `UPDATE gift_codes SET send_count = ?, recipient_name = 'Anna', emails_fired_json = ? WHERE id = ?`,
    [sendCount, JSON.stringify(emailsFired), giftId],
  );
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockMirrorGiftSubmission.mockClear();
  captureConsole();
});

describe("recordGiftEmailFailure", () => {
  it.each([
    ["gift_confirmation", "buyer"],
    ["gift_send", "recipient"],
    ["gift_opened", "buyer"],
  ] as const)("stores a %s failure for the %s role, never an address", async (emailType, role) => {
    const giftId = await activeGift();

    await recordGiftEmailFailure(giftId, { emailType, ...BOUNCE });

    const [failure] = (await findGiftById(giftId))!.emailFailures;
    expect(failure).toMatchObject({
      emailType,
      kind: "bounced",
      recipient: role,
      attemptNumber: 1,
      errorMessage: "550 <[address]>: mailbox unknown",
      resendId: "msg_gs_1",
      resolvedAt: null,
    });
    expect(JSON.stringify(failure)).not.toContain("@");
  });

  it("numbers repeat failures, bumps updated_at and mirrors the gift", async () => {
    const giftId = await activeGift();
    const before = (await findGiftById(giftId))!.updatedAt;

    await recordGiftEmailFailure(giftId, { emailType: "gift_send", ...BOUNCE });
    await recordGiftEmailFailure(giftId, { emailType: "gift_send", ...BOUNCE, resendId: "msg_2" });

    const gift = (await findGiftById(giftId))!;
    expect(gift.emailFailures.map((failure) => failure.attemptNumber)).toEqual([1, 2]);
    expect(gift.updatedAt > before).toBe(true);
    expect(mockMirrorGiftSubmission.mock.calls).toEqual([[giftId], [giftId]]);
  });

  it("reports to Sentry by gift id, without the address", async () => {
    const giftId = await activeGift();

    await recordGiftEmailFailure(giftId, { emailType: "gift_opened", ...BOUNCE });

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Customer email not sent: gift_opened (bounced)",
      expect.objectContaining({ tags: expect.objectContaining({ gift_id: giftId }) }),
    );
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain(
      "anna@example.com",
    );
  });
});

describe("resolving gift failures", () => {
  it("resolves open failures of the type a later successful send fired", async () => {
    const giftId = await activeGift();
    await recordGiftEmailFailure(giftId, { emailType: "gift_confirmation", ...BOUNCE });
    await recordGiftEmailFailure(giftId, { emailType: "gift_send", ...BOUNCE });
    mockMirrorGiftSubmission.mockClear();

    await appendGiftEmailFired(giftId, {
      type: "gift_confirmation",
      sentAt: "2026-10-05T09:00:00.000Z",
      resendId: "msg_gc_2",
    });

    const failures = (await findGiftById(giftId))!.emailFailures;
    expect(failures.map((failure) => [failure.emailType, failure.resolvedAt])).toEqual([
      ["gift_confirmation", "2026-10-05T09:00:00.000Z"],
      ["gift_send", null],
    ]);
    expect(mockMirrorGiftSubmission).toHaveBeenCalledWith(giftId);
  });

  it("does not mirror a fired email that resolved nothing", async () => {
    const giftId = await activeGift();

    await appendGiftEmailFired(giftId, {
      type: "gift_opened",
      sentAt: "2026-10-05T09:00:00.000Z",
      resendId: "msg_go",
    });

    expect(mockMirrorGiftSubmission).not.toHaveBeenCalled();
  });

  it("resolves the requested failure too when a Studio resend sent the buyer confirmation", async () => {
    const giftId = await activeGift();
    await recordGiftEmailFailure(giftId, { emailType: "gift_send", ...BOUNCE });

    await recordGiftEmailResent(
      giftId,
      { type: "gift_confirmation", sentAt: "2026-10-05T09:00:00.000Z", resendId: "msg_gc_2" },
      "gift_send",
    );

    const gift = (await findGiftById(giftId))!;
    expect(gift.emailFailures[0]?.resolvedAt).toBe("2026-10-05T09:00:00.000Z");
    expect(gift.emailsFired.at(-1)).toMatchObject({
      type: "gift_confirmation",
      resendId: "msg_gc_2",
    });
  });
});

describe("releaseBouncedGiftSend", () => {
  it.each([
    ["send 1 of 1", 1, ["msg_gs_1"], "msg_gs_1", 0],
    ["send 2 of 2", 2, ["msg_gs_0", "msg_gs_1"], "msg_gs_1", 1],
  ])(
    "gives the slot back when %s bounced and forgets the recipient name",
    async (_label, sendCount, resendIds, bounced, expected) => {
      const giftId = await activeGift();
      await setSends(giftId, sendCount, resendIds);
      mockMirrorGiftSubmission.mockClear();

      await releaseBouncedGiftSend((await findGiftById(giftId))!, bounced);

      const gift = (await findGiftById(giftId))!;
      expect(gift.sendCount).toBe(expected);
      expect(gift.recipientName).toBeNull();
      expect(mockMirrorGiftSubmission).toHaveBeenCalledOnce();
    },
  );

  it("keeps the slot when a late bounce of send 1 arrives while send 2 is claimed", async () => {
    const giftId = await activeGift();
    await setSends(giftId, 2, ["msg_gs_1", "msg_gs_2"]);

    await releaseBouncedGiftSend((await findGiftById(giftId))!, "msg_gs_1");

    expect((await findGiftById(giftId))!.sendCount).toBe(2);
  });

  it("keeps the slot when the send was claimed again after the bounced email", async () => {
    const giftId = await activeGift();
    await setSends(giftId, 2, ["msg_gs_1"]);

    await releaseBouncedGiftSend((await findGiftById(giftId))!, "msg_gs_1");

    expect((await findGiftById(giftId))!.sendCount).toBe(2);
  });

  it("keeps the slot once the gift is opened", async () => {
    const giftId = await activeGift();
    await setSends(giftId, 1, ["msg_gs_1"]);
    await forceGiftStatus(giftId, "redeemed");

    await releaseBouncedGiftSend((await findGiftById(giftId))!, "msg_gs_1");

    expect((await findGiftById(giftId))!.sendCount).toBe(1);
  });
});

describe("recordUnsentGiftEmail", () => {
  it.each([
    [{ kind: "failed" as const, error: "Resend 500", statusCode: 500 }, "send_error", "Resend 500"],
    [{ kind: "skipped" as const, reason: "no_api_key" as const }, "refused", "no_api_key"],
  ])("records an unsent result (%o)", async (result, kind, errorCode) => {
    const giftId = await activeGift();

    await recordUnsentGiftEmail(giftId, "gift_opened", "2026-10-05T09:00:00.000Z", result);

    expect((await findGiftById(giftId))!.emailFailures).toEqual([
      expect.objectContaining({
        emailType: "gift_opened",
        kind,
        errorCode,
        attemptedAt: "2026-10-05T09:00:00.000Z",
      }),
    ]);
  });

  it("records a thrown error with its message scrubbed", async () => {
    const giftId = await activeGift();

    await recordUnsentGiftEmail(
      giftId,
      "gift_confirmation",
      "2026-10-05T09:00:00.000Z",
      new Error("refused for dana@example.com"),
    );

    expect((await findGiftById(giftId))!.emailFailures[0]).toMatchObject({
      kind: "send_error",
      errorMessage: "refused for [address]",
    });
  });
});
