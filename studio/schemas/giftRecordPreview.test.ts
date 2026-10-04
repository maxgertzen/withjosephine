import { describe, expect, it } from "vitest";

import { buildGiftRecordPreview } from "./giftRecordPreview";

const BOUGHT = "2026-10-03T08:05:00.000Z";
const SENT = "2026-10-03T09:00:00.000Z";

function subtitleFor(status: string, sentAt?: string) {
  return buildGiftRecordPreview({
    readingName: "Birth Chart Reading",
    buyerFirstName: "Dana",
    status,
    sentAt,
    paidAt: BOUGHT,
  }).subtitle;
}

describe("buildGiftRecordPreview", () => {
  it("titles the row with the reading name", () => {
    expect(
      buildGiftRecordPreview({ readingName: "Birth Chart Reading", status: "active" }).title,
    ).toBe("Birth Chart Reading");
  });

  it.each([
    ["active", undefined, "Waiting"],
    ["active", SENT, "Sent by email"],
    ["redeemed", SENT, "Opened"],
    ["cancelled", SENT, "Cancelled"],
  ])("labels %s with sentAt %s as %s", (status, sentAt, label) => {
    expect(subtitleFor(status, sentAt)).toBe(`From Dana · ${label} · Bought 3 Oct 2026`);
  });

  it("falls back to Gift when the reading is not resolved", () => {
    expect(buildGiftRecordPreview({ status: "active" })).toEqual({
      title: "Gift",
      subtitle: "Waiting",
    });
  });
});
