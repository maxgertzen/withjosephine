import { describe, expect, it } from "vitest";

import {
  BOOKING_PAGE_ELEMENTS,
  chooseLayoutEntries,
  DEFAULT_BOOKING_PAGE_LAYOUT,
  DEFAULT_ORDER,
  defaultBookingPageLayoutEntries,
  normalizeLayoutEntries,
  resolveBookingPageLayout,
} from "./pageLayout";

const allAboveForm = DEFAULT_ORDER.filter(
  (key) => key !== "form" && key !== "testimonial",
);

describe("resolveBookingPageLayout", () => {
  it("renders every element above the form with the testimonial inside it by default", () => {
    expect(DEFAULT_BOOKING_PAGE_LAYOUT).toEqual({
      aboveForm: allAboveForm,
      belowForm: [],
      testimonialInsideForm: true,
    });
  });

  it("puts elements listed after the form below it", () => {
    const layout = resolveBookingPageLayout([
      { element: "summary" },
      { element: "form" },
      { element: "notes" },
    ]);
    expect(layout.belowForm[0]).toBe("notes");
    expect(layout.aboveForm[0]).toBe("summary");
  });

  it("leaves out hidden elements but never hides the form", () => {
    const layout = resolveBookingPageLayout([
      { element: "otherReadings", hidden: true },
      { element: "form", hidden: true },
    ]);
    expect([...layout.aboveForm, ...layout.belowForm]).not.toContain("otherReadings");
    expect(layout.aboveForm).not.toContain("form");
    expect(layout.belowForm).not.toContain("form");
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
    expect(resolveBookingPageLayout(stored).aboveForm).toEqual(allAboveForm);
  });

  it("shows the testimonial at its list position when it is not inside the form", () => {
    const others = defaultBookingPageLayoutEntries().filter(
      (entry) => entry.element !== "testimonial",
    );
    const layout = resolveBookingPageLayout([
      { element: "testimonial", insideForm: false },
      ...others,
    ]);
    expect(layout.aboveForm[0]).toBe("testimonial");
    expect(layout.testimonialInsideForm).toBe(false);
  });

  it("drops a hidden testimonial from the page and the form", () => {
    const layout = resolveBookingPageLayout([
      { element: "testimonial", hidden: true, insideForm: true },
    ]);
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
  it("keeps stored flags, drops unknown and repeated entries, and adds missing ones with defaults", () => {
    const normalized = normalizeLayoutEntries([
      { element: "form" },
      { element: "retired" },
      { element: "facts", hidden: true },
      { element: "form", hidden: true },
    ]);
    expect(normalized.map((entry) => entry.element)).toHaveLength(BOOKING_PAGE_ELEMENTS.length);
    expect(normalized.find((entry) => entry.element === "facts")?.hidden).toBe(true);
    expect(normalized.find((entry) => entry.element === "testimonial")?.insideForm).toBe(true);
    expect(normalized.filter((entry) => entry.element === "form")).toEqual([{ element: "form" }]);
  });
});
