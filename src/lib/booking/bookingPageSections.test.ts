import { describe, expect, it } from "vitest";

import {
  builtInBookingPage,
  chooseBookingPage,
  partRows,
  resolveBookingPage,
  type StoredSection,
} from "./bookingPageSections";

type Question = { id: string };
type Quote = { quote: string };
type Stored = StoredSection<Question, Quote>;

const part = (type: string, extra: Partial<Stored> = {}): Stored => ({ _key: type, _type: type, ...extra });
const kinds = (sections: { kind: string; key: string }[]) => sections.map(({ key }) => key);

describe("resolveBookingPage", () => {
  it("splits the sections at the form and keeps their order", () => {
    const page = resolveBookingPage<Question, Quote>([
      part("readerSection"),
      part("summarySection"),
      part("formSection"),
      part("notesSection"),
    ]);
    expect(kinds(page.aboveForm)).toEqual(["readerSection", "summarySection"]);
    expect(kinds(page.belowForm)).toEqual(["notesSection"]);
  });

  it("leaves out switched-off sections but never the form", () => {
    const page = resolveBookingPage<Question, Quote>([
      part("factsSection", { shown: false }),
      part("formSection", { shown: false }),
      part("notesSection"),
    ]);
    expect(kinds(page.aboveForm)).toEqual([]);
    expect(kinds(page.belowForm)).toEqual(["notesSection"]);
  });

  it("shows a part listed twice only once", () => {
    const page = resolveBookingPage<Question, Quote>([part("factsSection"), { ...part("factsSection"), _key: "again" }]);
    expect(kinds(page.aboveForm)).toEqual(["factsSection"]);
  });

  it("keeps every accordion, and drops ones with nothing in them", () => {
    const page = resolveBookingPage<Question, Quote>([
      { _key: "a", _type: "listSection", title: "What's included", items: ["Voice note", " "] },
      { _key: "b", _type: "listSection", title: "Extras", items: ["PDF"] },
      { _key: "c", _type: "listSection", title: "Empty", items: [] },
      { _key: "d", _type: "questionsSection", title: "Questions", questions: [{ id: "q1" }, null] },
      { _key: "e", _type: "questionsSection", title: "No questions", questions: [] },
    ]);
    expect(page.aboveForm).toEqual([
      { key: "a", kind: "list", title: "What's included", items: ["Voice note"] },
      { key: "b", kind: "list", title: "Extras", items: ["PDF"] },
      { key: "d", kind: "questions", title: "Questions", questions: [{ id: "q1" }] },
    ]);
  });

  it("puts the testimonial inside the form unless its switch says otherwise", () => {
    const quote = { quote: "Thank you" };
    const inside = resolveBookingPage<Question, Quote>([{ _key: "t", _type: "testimonialSection", testimonial: quote }]);
    expect(inside.testimonialInsideForm).toBe(quote);
    expect(inside.aboveForm).toEqual([]);

    const onPage = resolveBookingPage<Question, Quote>([
      { _key: "t", _type: "testimonialSection", testimonial: quote, insideForm: false },
    ]);
    expect(onPage.testimonialInsideForm).toBeUndefined();
    expect(onPage.aboveForm).toEqual([{ key: "t", kind: "testimonial", testimonial: quote }]);
  });

  it("drops a hidden testimonial from the page and the form", () => {
    const page = resolveBookingPage<Question, Quote>([
      { _key: "t", _type: "testimonialSection", testimonial: { quote: "Hi" }, shown: false },
    ]);
    expect(page.testimonialInsideForm).toBeUndefined();
    expect(page.aboveForm).toEqual([]);
  });

  it("ignores section types it does not know", () => {
    expect(resolveBookingPage<Question, Quote>([part("retiredSection")]).aboveForm).toEqual([]);
  });
});

describe("chooseBookingPage", () => {
  it("uses the reading's list, then the starting list, then the built-in one", () => {
    const reading = [part("factsSection")];
    const starting = [part("notesSection")];
    expect(chooseBookingPage(reading, starting)).toEqual({ rows: reading, owner: "reading" });
    expect(chooseBookingPage([], starting)).toEqual({ rows: starting, owner: "starting" });
    expect(chooseBookingPage(null, undefined)).toEqual({ rows: builtInBookingPage(), owner: "builtIn" });
  });
});

describe("partRows", () => {
  it("finds the first row of each part and skips boxes", () => {
    const first = part("readerSection", { name: "Josephine" });
    const rows = partRows([part("listSection"), first, { ...part("readerSection"), _key: "again", name: "Other" }]);
    expect(rows).toEqual({ readerSection: first });
  });
});

describe("builtInBookingPage", () => {
  it("follows Max's order with the testimonial inside the form", () => {
    expect(builtInBookingPage().map(({ _type }) => _type)).toEqual([
      "summarySection",
      "factsSection",
      "readerSection",
      "listSection",
      "listSection",
      "giftRowSection",
      "questionsSection",
      "introSection",
      "testimonialSection",
      "formSection",
      "otherReadingsSection",
      "notesSection",
    ]);
  });
});
