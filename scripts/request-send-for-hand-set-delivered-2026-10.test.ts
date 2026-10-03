import { describe, expect, it } from "vitest";

import {
  HAND_SET_DELIVERED_GROQ,
  type HandSetDeliveredDoc,
  planHandSetDelivered,
} from "./request-send-for-hand-set-delivered-2026-10.mts";

const doc = (overrides: Partial<HandSetDeliveredDoc>): HandSetDeliveredDoc => ({
  _id: "sub_1",
  email: "client@example.com",
  deliveredAt: "2026-10-01T09:00:00Z",
  voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
  ...overrides,
});

describe("planHandSetDelivered", () => {
  it("requests a send for a hand-set submission with both files published", () => {
    const plan = planHandSetDelivered([doc({})]);

    expect(plan.toRequest.map((d) => d._id)).toEqual(["sub_1"]);
    expect(plan.missingFiles).toEqual([]);
    expect(plan.sandbox).toEqual([]);
  });

  it("leaves a submission without both published files for Becky", () => {
    const plan = planHandSetDelivered([doc({ pdfUrl: undefined })]);

    expect(plan.toRequest).toEqual([]);
    expect(plan.missingFiles.map((d) => d._id)).toEqual(["sub_1"]);
  });

  it("leaves e2e sandbox addresses alone", () => {
    const plan = planHandSetDelivered([
      doc({ _id: "sub_e2e", email: "listen-roundtrip+abc@withjosephine.com" }),
      doc({ _id: "sub_real", email: "hello@withjosephine.com" }),
    ]);

    expect(plan.sandbox.map((d) => d._id)).toEqual(["sub_e2e"]);
    expect(plan.toRequest.map((d) => d._id)).toEqual(["sub_real"]);
  });
});

describe("HAND_SET_DELIVERED_GROQ", () => {
  it("selects published paid submissions with deliveredAt, no request and no recorded day7 email", () => {
    expect(HAND_SET_DELIVERED_GROQ).toContain('!(_id in path("drafts.**"))');
    expect(HAND_SET_DELIVERED_GROQ).toContain('status == "paid"');
    expect(HAND_SET_DELIVERED_GROQ).toContain("defined(deliveredAt)");
    expect(HAND_SET_DELIVERED_GROQ).toContain("!defined(deliveryRequestedAt)");
    expect(HAND_SET_DELIVERED_GROQ).toContain(
      'coalesce(count(emailsFired[type == "day7"]), 0) == 0',
    );
  });
});
