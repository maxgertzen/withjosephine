import { describe, expect, it } from "vitest";

import { planReadingDeletion, type ReadingReferrer } from "./readingDeletion";

const ID = "reading-akashic-record";
const plan = (referrers: ReadingReferrer[]) => planReadingDeletion(ID, "Akashic Records Reading", referrers);

describe("planReadingDeletion", () => {
  it("blocks a reading that has orders", () => {
    const result = plan([
      { _id: "submission-1", _type: "submission" },
      { _id: "submission-2", _type: "submission" },
    ]);
    expect(result.blocked).toEqual(["2 orders are linked to this reading."]);
  });

  it("blocks when a form part shows only for this reading", () => {
    const result = plan([
      { _id: "formField-photo", _type: "formField", title: "Photo", appliesToServices: [ID] },
    ]);
    expect(result.blocked[0]).toContain('"Photo" is set to show only for this reading');
  });

  it("blocks on a document type it does not know how to unlink", () => {
    const result = plan([{ _id: "x", _type: "landingPage", title: "Home" }]);
    expect(result.blocked).toHaveLength(1);
  });

  it("unlinks notes, shared form parts, testimonials and thank-you wording, published and draft", () => {
    const result = plan([
      { _id: "note-1", _type: "article" },
      { _id: "drafts.note-1", _type: "article" },
      { _id: "formField-photo", _type: "formField", appliesToServices: ["reading-soul-blueprint", ID] },
      { _id: "testimonial-1", _type: "testimonial", detailOverride: null },
      { _id: "testimonial-2", _type: "testimonial", detailOverride: "Akashic reading" },
      { _id: "thankYouPage", _type: "thankYouPage", overrideKeys: ["k1"] },
    ]);

    expect(result.blocked).toEqual([]);
    expect(result.patches).toEqual([
      { id: "note-1", unset: ["relatedReading"] },
      { id: "drafts.note-1", unset: ["relatedReading"] },
      { id: "formField-photo", unset: [`appliesToServices[_ref=="${ID}"]`] },
      { id: "testimonial-1", unset: ["readingType"], set: { detailOverride: "Akashic Records Reading" } },
      { id: "testimonial-2", unset: ["readingType"], set: undefined },
      { id: "thankYouPage", unset: ['overrides[_key=="k1"]'] },
    ]);
    expect(result.summary).toEqual([
      "1 note loses its reading box.",
      "1 form part stops listing this reading.",
      '2 testimonials keep "Akashic Records Reading" under the quote.',
      "The thank-you page drops this reading's own wording.",
    ]);
  });
});

describe("planReadingDeletion edge cases", () => {
  it("lists a reason once when the draft and published copies both block", () => {
    const result = plan([
      { _id: "formField-photo", _type: "formField", title: "Photo", appliesToServices: [ID] },
      { _id: "drafts.formField-photo", _type: "formField", title: "Photo", appliesToServices: [ID] },
    ]);
    expect(result.blocked).toHaveLength(1);
  });

  it("blocks a reading with changes waiting in a release", () => {
    expect(planReadingDeletion(ID, "Akashic", [], 1).blocked[0]).toContain("waiting in a release");
  });
});
