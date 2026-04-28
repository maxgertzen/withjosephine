import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({
  constructWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
  markSubmissionExpired: vi.fn(),
}));

vi.mock("@/lib/booking/notifyPaid", () => ({
  applyPaidEvent: vi.fn(),
}));

import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById, markSubmissionExpired } from "@/lib/booking/submissions";
import { constructWebhookEvent } from "@/lib/stripe";

const mockConstruct = vi.mocked(constructWebhookEvent);
const mockFind = vi.mocked(findSubmissionById);
const mockApply = vi.mocked(applyPaidEvent);
const mockMarkExpired = vi.mocked(markSubmissionExpired);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
};

beforeEach(() => {
  mockConstruct.mockReset();
  mockFind.mockReset();
  mockApply.mockReset().mockResolvedValue("applied");
  mockMarkExpired.mockReset().mockResolvedValue(undefined);
});

async function callRoute(
  body: string,
  headers: Record<string, string> = { "stripe-signature": "sig" },
): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers,
      body,
    }),
  );
}

describe("/api/stripe/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await callRoute("{}", {});
    expect(res.status).toBe(400);
    expect(mockConstruct).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification throws", async () => {
    mockConstruct.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });
    const res = await callRoute("{}");
    expect(res.status).toBe(400);
  });

  it("uses raw text body for signature verification (not parsed json)", async () => {
    mockConstruct.mockImplementationOnce(() => {
      throw new Error("ignored");
    });
    await callRoute('{"raw":"body"}');
    expect(mockConstruct).toHaveBeenCalledWith('{"raw":"body"}', "sig");
  });

  it("on checkout.session.completed marks paid via applyPaidEvent", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: {
        object: { id: "cs_1", client_reference_id: "sub_1" },
      },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);

    const res = await callRoute("{}");

    expect(res.status).toBe(200);
    expect(mockApply).toHaveBeenCalledWith(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2024-04-28T08:00:00.000Z",
    });
  });

  it("returns 200 silently when checkout.session.completed has no client_reference_id", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: null } },
    } as never);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("returns 200 silently when submission is missing (no retry)", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: "missing" } },
    } as never);
    mockFind.mockResolvedValueOnce(null);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("on idempotent replay applyPaidEvent reports alreadyApplied and route returns 200", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, stripeEventId: "evt_1" });
    mockApply.mockResolvedValueOnce("alreadyApplied");

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
  });

  it("on checkout.session.expired marks submission expired", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.expired",
      created: 1714291200,
      data: { object: { id: "cs_2", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockMarkExpired).toHaveBeenCalledWith("sub_1", {
      stripeEventId: "evt_2",
      expiredAt: "2024-04-28T08:00:00.000Z",
    });
  });

  it("ignores unrelated event types (returns 200, no work)", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_3",
      type: "invoice.paid",
      created: 1714291200,
      data: { object: {} },
    } as never);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
    expect(mockMarkExpired).not.toHaveBeenCalled();
  });

  it("does not double-apply expired event when stripeEventId already matches", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.expired",
      created: 1714291200,
      data: { object: { id: "cs_2", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, stripeEventId: "evt_2" });

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockMarkExpired).not.toHaveBeenCalled();
  });
});
