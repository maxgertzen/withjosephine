import { describe, expect, it } from "vitest";

import { fieldMapBlockProps, fieldMapCardProps } from "./sanityFieldMapFixture";

describe("Sanity field map", () => {
  it("feeds the homepage card from Promise, Description, What's included and the Readings Section buttons", () => {
    const card = fieldMapCardProps();

    expect(card.valueProposition).toBe("[Reading › Promise · valueProposition]");
    expect(card.briefDescription).toBe("[Reading › Description · briefDescription]");
    expect(card.includes).toEqual([
      "[Reading › What's included · includes[0]]",
      "[Reading › What's included · includes[1]]",
      "[Reading › What's included · includes[2]]",
    ]);
    expect(card.labels).toEqual({
      learnMoreLabel: "[Landing Page › Readings Section › Learn More button · readingsSection.learnMoreLabel]",
      showLessLabel: "[Landing Page › Readings Section › Show Less button · readingsSection.showLessLabel]",
      bookButtonText: "[Landing Page › Readings Section › Book button · readingsSection.bookButtonText]",
    });
  });

  it("feeds the booking page block from the same Promise, Description and What's included, plus How it works", () => {
    const block = fieldMapBlockProps();

    expect(block.lead).toBe("[Reading › Promise · valueProposition]");
    expect(block.description).toBe("[Reading › Description · briefDescription]");
    expect(block.included.items).toEqual(fieldMapCardProps().includes);
    expect(block.howItWorks.content.map((paragraph) => paragraph.children[0].text)).toEqual([
      "[Reading › How it works · howItWorks[0]]",
      "[Reading › How it works · howItWorks[1]]",
    ]);
  });
});
