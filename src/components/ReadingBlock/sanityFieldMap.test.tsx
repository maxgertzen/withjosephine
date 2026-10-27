import { describe, expect, it } from "vitest";

import { fieldMapBlockProps, fieldMapCardProps } from "./sanityFieldMapFixture";

describe("Sanity field map", () => {
  it("feeds the homepage card from Promise, Description, the lines under Learn More and the Readings Section buttons", () => {
    const card = fieldMapCardProps();

    expect(card.valueProposition).toBe("[Reading › Promise · valueProposition]");
    expect(card.briefDescription).toBe("[Reading › Description · briefDescription]");
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

  it("feeds the booking page from the same Promise and Description, and its boxes from the reading's Booking page list", () => {
    const { block, sections } = fieldMapBlockProps();

    expect(block.lead).toBe("[Reading › Promise · valueProposition]");
    expect(block.description).toBe("[Reading › Description · briefDescription]");
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
