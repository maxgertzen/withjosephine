import { describe, expect, it } from "vitest";

import {
  BOOKING_PAGE_ELEMENTS,
  chooseLayoutEntries,
  DEFAULT_BOOKING_PAGE_LAYOUT,
  defaultBookingPageLayoutEntries,
  HIDEABLE_ELEMENTS,
  normalizeLayoutEntries,
  resolveBookingPageLayout,
} from "./pageLayout";

describe("resolveBookingPageLayout", () => {
  it("uses the built-in order with the testimonial inside the form", () => {
    expect(DEFAULT_BOOKING_PAGE_LAYOUT).toEqual({
      aboveForm: ["summary", "facts", "reader", "included", "howItWorks", "giftRow", "questions", "intro"],
      belowForm: ["otherReadings", "notes"],
      testimonialInsideForm: true,
    });
  });

  it("puts elements listed after the form below it", () => {
    const layout = resolveBookingPageLayout([{ element: "summary" }, { element: "form" }, { element: "facts" }]);
    expect(layout.aboveForm[0]).toBe("summary");
    expect(layout.belowForm).toContain("facts");
    expect(layout.aboveForm).not.toContain("facts");
  });

  it("hides what either list hides, and never the form", () => {
    const layout = resolveBookingPageLayout(defaultBookingPageLayoutEntries(), {
      hiddenEverywhere: ["otherReadings", "form"],
      hiddenOnReading: ["facts"],
    });
    const shown = [...layout.aboveForm, ...layout.belowForm];
    expect(shown).not.toContain("otherReadings");
    expect(shown).not.toContain("facts");
    expect(shown).toContain("notes");
  });

  it("ignores unknown elements and keeps the first of a duplicate", () => {
    const layout = resolveBookingPageLayout([
      { element: "facts" },
      { element: "retired" },
      { element: "form" },
      { element: "facts" },
    ]);
    expect(layout.aboveForm.filter((element) => element === "facts")).toHaveLength(1);
    expect(layout.belowForm).not.toContain("facts");
  });

  it("brings back a missing element after its default neighbour", () => {
    const stored = defaultBookingPageLayoutEntries().filter((entry) => entry.element !== "reader");
    expect(resolveBookingPageLayout(stored)).toEqual(DEFAULT_BOOKING_PAGE_LAYOUT);
  });

  it("shows the testimonial at its list position when it is not inside the form", () => {
    const layout = resolveBookingPageLayout(defaultBookingPageLayoutEntries(), { testimonialInsideForm: false });
    expect(layout.aboveForm.at(-1)).toBe("testimonial");
    expect(layout.testimonialInsideForm).toBe(false);
  });

  it("drops a hidden testimonial from the page and the form", () => {
    const layout = resolveBookingPageLayout(defaultBookingPageLayoutEntries(), {
      hiddenOnReading: ["testimonial"],
      testimonialInsideForm: false,
    });
    expect(layout.aboveForm).not.toContain("testimonial");
    expect(layout.testimonialInsideForm).toBe(false);
  });
});

describe("chooseLayoutEntries", () => {
  it("prefers the reading's own list, then the shared list, then the built-in order", () => {
    const reading = [{ element: "form" }];
    const shared = [{ element: "facts" }];
    expect(chooseLayoutEntries(reading, shared)).toBe(reading);
    expect(chooseLayoutEntries([], shared)).toBe(shared);
    expect(chooseLayoutEntries(null, undefined)).toEqual(defaultBookingPageLayoutEntries());
  });
});

describe("normalizeLayoutEntries", () => {
  it("drops unknown and repeated entries, drops stored flags, and adds missing ones", () => {
    const normalized = normalizeLayoutEntries([
      { element: "form" },
      { element: "retired" },
      { element: "facts", hidden: true } as { element: string },
      { element: "form" },
    ]);
    expect(normalized).toHaveLength(BOOKING_PAGE_ELEMENTS.length);
    expect(normalized.find((entry) => entry.element === "facts")).toEqual({ element: "facts" });
    expect(normalized.filter((entry) => entry.element === "form")).toEqual([{ element: "form" }]);
  });
});

describe("HIDEABLE_ELEMENTS", () => {
  it("lists every part except the form", () => {
    expect(HIDEABLE_ELEMENTS.map(({ key }) => key)).toEqual(
      BOOKING_PAGE_ELEMENTS.map(({ key }) => key).filter((key) => key !== "form"),
    );
  });
});
