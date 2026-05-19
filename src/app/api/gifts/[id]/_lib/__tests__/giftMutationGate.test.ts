import { describe, expect, it } from "vitest";

import type { SubmissionRecord } from "@/lib/booking/submissions";

import { GIFT_GATE_409, giftMutationGate } from "../giftMutationGate";

type GateSubmission = Pick<
  SubmissionRecord,
  | "giftDeliveryMethod"
  | "giftCancelledAt"
  | "giftClaimedAt"
  | "giftClaimEmailFiredAt"
  | "giftClaimSentNowAt"
>;

const okScheduled: GateSubmission = {
  giftDeliveryMethod: "scheduled",
  giftCancelledAt: null,
  giftClaimedAt: null,
  giftClaimEmailFiredAt: null,
  giftClaimSentNowAt: null,
};

const okSelfSend: GateSubmission = {
  giftDeliveryMethod: "self_send",
  giftCancelledAt: null,
  giftClaimedAt: null,
  giftClaimEmailFiredAt: null,
  giftClaimSentNowAt: null,
};

async function bodyOf(res: Response | null): Promise<{ error: string } | null> {
  if (!res) return null;
  return (await res.json()) as { error: string };
}

describe("giftMutationGate", () => {
  it("returns null when scheduled-mode submission is clean", () => {
    expect(giftMutationGate(okScheduled, { requireMethod: "scheduled" })).toBeNull();
  });

  it("returns null when selfSend-mode submission is clean", () => {
    expect(giftMutationGate(okSelfSend, { requireMethod: "selfSend" })).toBeNull();
  });

  it("returns 409 notScheduled when method != scheduled and require=scheduled", async () => {
    const res = giftMutationGate(okSelfSend, { requireMethod: "scheduled" });
    expect(res?.status).toBe(409);
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.notScheduled);
  });

  it("returns 409 notSelfSend when method != self_send and require=selfSend", async () => {
    const res = giftMutationGate(okScheduled, { requireMethod: "selfSend" });
    expect(res?.status).toBe(409);
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.notSelfSend);
  });

  it("returns 409 cancelled when giftCancelledAt set", async () => {
    const res = giftMutationGate(
      { ...okScheduled, giftCancelledAt: "2026-01-01T00:00:00.000Z" },
      { requireMethod: "scheduled" },
    );
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.cancelled);
  });

  it("returns 409 claimed when giftClaimedAt set", async () => {
    const res = giftMutationGate(
      { ...okScheduled, giftClaimedAt: "2026-01-01T00:00:00.000Z" },
      { requireMethod: "scheduled" },
    );
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.claimed);
  });

  it("returns 409 alarmAlreadyFired when giftClaimEmailFiredAt set", async () => {
    const res = giftMutationGate(
      { ...okScheduled, giftClaimEmailFiredAt: "2026-01-01T00:00:00.000Z" },
      { requireMethod: "scheduled" },
    );
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.alarmAlreadyFired);
  });

  it("returns 409 sentNow when giftClaimSentNowAt set", async () => {
    const res = giftMutationGate(
      { ...okScheduled, giftClaimSentNowAt: "2026-01-01T00:00:00.000Z" },
      { requireMethod: "scheduled" },
    );
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.sentNow);
  });

  it("opts out of sentNow check when checkSentNow=false (cancel-auto-send shape)", () => {
    expect(
      giftMutationGate(
        { ...okScheduled, giftClaimSentNowAt: "2026-01-01T00:00:00.000Z" },
        { requireMethod: "scheduled", checkSentNow: false },
      ),
    ).toBeNull();
  });

  it("opts out of alarmFired + sentNow checks when both false (flip-to-scheduled shape)", () => {
    expect(
      giftMutationGate(
        {
          ...okSelfSend,
          giftClaimEmailFiredAt: "2026-01-01T00:00:00.000Z",
          giftClaimSentNowAt: "2026-01-01T00:00:00.000Z",
        },
        { requireMethod: "selfSend", checkAlarmFired: false, checkSentNow: false },
      ),
    ).toBeNull();
  });

  it("cancelled precedes alarmFired check (cancelled wins on collision)", async () => {
    const res = giftMutationGate(
      {
        ...okScheduled,
        giftCancelledAt: "2026-01-01T00:00:00.000Z",
        giftClaimEmailFiredAt: "2026-01-02T00:00:00.000Z",
      },
      { requireMethod: "scheduled" },
    );
    expect((await bodyOf(res))?.error).toBe(GIFT_GATE_409.cancelled);
  });
});
