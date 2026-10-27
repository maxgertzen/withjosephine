import { describe, expect, it } from "vitest";

import { fieldMapBlockProps, fieldMapCardProps } from "./sanityFieldMapFixture";

describe("Sanity field map", () => {
  it("feeds the homepage card from Promise, Description, the lines under Learn More and the Readings Section buttons", () => {
    const card = fieldMapCardProps();

    expect(card.valueProposition).toBe("[Reading › Promise on the homepage card · valueProposition]");
    expect(card.briefDescription).toBe("[Reading › Description on the homepage card · briefDescription]");
    expect(card.includes).toEqual([
      "[Reading › Lines under 'Learn More' on the homepage card · includes[0]]",
      "[Reading › Lines under 'Learn More' on the homepage card · includes[1]]",
      "[Reading › Lines under 'Learn More' on the homepage card · includes[2]]",
    ]);
    expect(card.labels).toEqual({
      learnMoreLabel: "[Landing Page › Readings Section › Learn More button · readingsSection.learnMoreLabel]",
      showLessLabel: "[Landing Page › Readings Section › Show Less button · readingsSection.showLessLabel]",
      bookButtonText: "[Landing Page › Readings Section › Book button · readingsSection.bookButtonText]",
    });
  });

  it("feeds the booking page promise, description and boxes from the reading's Booking page list, not from the homepage card", () => {
    const { block, sections } = fieldMapBlockProps();

    expect(block.lead).toBe("[Reading › Booking page › Promise · bookingPage[summary].promise]");
    expect(block.description).toBe("[Reading › Booking page › Description · bookingPage[summary].description]");
    expect(sections.filter((section) => section.kind === "list")).toEqual([
      {
        key: "included",
        kind: "list",
        title: "[Reading › Booking page › Box heading · bookingPage[included].title]",
        items: [0, 1, 2].map((index) => `[Reading › Booking page › Box line · bookingPage[included].items[${index}]]`),
      },
      {
        key: "how",
        kind: "list",
        title: "[Reading › Booking page › Box heading · bookingPage[how].title]",
        items: [0, 1].map((index) => `[Reading › Booking page › Box line · bookingPage[how].items[${index}]]`),
      },
    ]);
  });
});
