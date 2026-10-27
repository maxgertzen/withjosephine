import { describe, expect, it } from "vitest";

import { buildSections, oldOrder } from "./migrate-booking-page-sections-2026-10.mts";

const types = (sections: { _type: string }[]) => sections.map(({ _type }) => _type);

describe("oldOrder", () => {
  it("keeps the stored order, drops unknown and repeated parts, and adds missing parts after their neighbour", () => {
    expect(oldOrder([{ element: "notes" }, { element: "retired" }, { element: "notes" }, { element: "form" }])).toEqual([
      "summary",
      "facts",
      "reader",
      "included",
      "howItWorks",
      "giftRow",
      "questions",
      "intro",
      "testimonial",
      "notes",
      "form",
      "otherReadings",
    ]);
  });
});

describe("buildSections", () => {
  const shared = {
    pageLayout: [{ element: "form" }],
    hiddenParts: ["otherReadings"],
    testimonialInsideForm: false,
    readingPageContent: { includedTitle: "Included" },
  };

  it("turns a reading's old fields into one list, in the reading's order with both hide lists", () => {
    const sections = buildSections(shared, {
      _id: "reading-a",
      includes: ["Card line"],
      bookingIncludes: ["Page line", " "],
      howItWorks: ["Step one"],
      questionsOnPage: [{ _ref: "faq-1", _key: "k1" }],
      formTestimonial: { _ref: "testimonial-1" },
      pageLayout: [{ element: "notes" }, { element: "form" }],
      hiddenParts: ["facts"],
    });

    expect(types(sections).indexOf("notesSection")).toBeLessThan(types(sections).indexOf("formSection"));
    expect(sections.find((section) => section._key === "facts")).toMatchObject({ shown: false });
    expect(sections.find((section) => section._key === "otherReadings")).toMatchObject({ shown: false });
    expect(sections.find((section) => section._key === "included")).toEqual({
      _key: "included",
      _type: "listSection",
      shown: true,
      title: "Included",
      items: ["Page line"],
    });
    expect(sections.find((section) => section._key === "howItWorks")).toMatchObject({ title: "How it works", items: ["Step one"] });
    expect(sections.find((section) => section._key === "questions")).toMatchObject({
      questions: [{ _type: "reference", _ref: "faq-1", _key: "k1" }],
    });
    expect(sections.find((section) => section._key === "testimonial")).toMatchObject({
      insideForm: false,
      testimonial: { _type: "reference", _ref: "testimonial-1" },
    });
    expect(sections.find((section) => section._key === "form")).toEqual({ _key: "form", _type: "formSection" });
  });

  it("uses the homepage card list when the booking page list is empty", () => {
    const sections = buildSections(shared, { _id: "reading-a", includes: ["Card line"], bookingIncludes: [] });
    expect(sections.find((section) => section._key === "included")).toMatchObject({ items: ["Card line"] });
  });

  it("moves the reading's own facts and opening words into their rows", () => {
    const facts = [{ _key: "f1", label: "Length", value: "1 hour" }];
    const intakeIntro = [{ _key: "b1", _type: "block", children: [] }];
    const sections = buildSections(shared, { _id: "reading-a", facts, intakeIntro });

    expect(sections.find((section) => section._key === "facts")).toEqual({ _key: "facts", _type: "factsSection", shown: true, facts });
    expect(sections.find((section) => section._key === "intro")).toEqual({
      _key: "intro",
      _type: "introSection",
      shown: true,
      openingWords: intakeIntro,
    });
  });

  it("builds the starting list from Booking Form alone, with empty boxes and no words", () => {
    const sections = buildSections(shared, null);
    expect(types(sections).at(-1)).toBe("notesSection");
    expect(sections.find((section) => section._key === "included")).toMatchObject({ items: [] });
    expect(sections.find((section) => section._key === "testimonial")).not.toHaveProperty("testimonial");
    expect(sections.find((section) => section._key === "facts")).not.toHaveProperty("facts");
    expect(sections.find((section) => section._key === "intro")).not.toHaveProperty("openingWords");
  });
});
