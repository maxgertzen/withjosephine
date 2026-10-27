import { describe, expect, it } from "vitest";

import { summaryWordsToCopy } from "./copy-booking-summary-words-2026-10.mts";

const reading = {
  _id: "reading-a",
  valueProposition: "Homepage promise",
  briefDescription: "Homepage description",
};

describe("summaryWordsToCopy", () => {
  it("copies the homepage words into an empty booking page row", () => {
    expect(summaryWordsToCopy({ ...reading, summary: { _key: "summary" } })).toEqual({
      'bookingPage[_key=="summary"].promise': "Homepage promise",
      'bookingPage[_key=="summary"].description': "Homepage description",
    });
  });

  it("keeps words the booking page row already has", () => {
    expect(
      summaryWordsToCopy({ ...reading, summary: { _key: "summary", promise: "Own promise", description: " " } }),
    ).toEqual({ 'bookingPage[_key=="summary"].description': "Homepage description" });
  });

  it("does nothing when the reading has no summary row or no homepage words", () => {
    expect(summaryWordsToCopy(reading)).toEqual({});
    expect(summaryWordsToCopy({ _id: "reading-b", summary: { _key: "summary" } })).toEqual({});
  });
});
