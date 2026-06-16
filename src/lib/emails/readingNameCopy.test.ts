import { describe, expect, it } from "vitest";

import {
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_GIFT_CLAIM_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  GIFT_INTAKE_PAGE_DEFAULTS,
} from "@/data/defaults";
import { READINGS } from "@/data/readings";

import { applyTokens } from "./applyTokens";

const BARE_NAMES = READINGS.map((r) => r.name);

describe("reading names are bare (ekesibyy)", () => {
  it("carry no leading article and no embedded 'Reading' word", () => {
    for (const name of BARE_NAMES) {
      expect(name).not.toMatch(/^The\b/);
      expect(name).not.toMatch(/\breading\b/i);
    }
  });

  it("are exactly the three canonical bare names", () => {
    expect(BARE_NAMES).toEqual(["Soul Blueprint", "Birth Chart", "Akashic Record"]);
  });
});

describe("email/page copy reads '<name> reading' with no double-noun (ekesibyy)", () => {
  const renderedFor = (name: string): string =>
    [
      EMAIL_ORDER_CONFIRMATION_DEFAULTS.body,
      EMAIL_DAY7_DELIVERY_DEFAULTS.subjectTemplate,
      EMAIL_DAY7_DELIVERY_DEFAULTS.bodyIntro,
      EMAIL_GIFT_CLAIM_DEFAULTS.body,
      GIFT_INTAKE_PAGE_DEFAULTS.lede,
    ]
      .map((field) => JSON.stringify(applyTokens(field, { readingName: name })))
      .join(" ");

  it("renders the bare name followed by 'reading' in each template", () => {
    for (const name of BARE_NAMES) {
      const rendered = renderedFor(name);
      expect(rendered).toContain(`${name} reading`);
    }
  });

  it("never produces a 'reading reading' double-noun", () => {
    for (const name of BARE_NAMES) {
      expect(renderedFor(name).toLowerCase()).not.toContain("reading reading");
    }
  });

  it("leaves no unresolved {readingName} token", () => {
    for (const name of BARE_NAMES) {
      expect(renderedFor(name)).not.toContain("{readingName}");
    }
  });

  it("day-7 subject reads 'Your <name> reading is ready'", () => {
    const subject = applyTokens(EMAIL_DAY7_DELIVERY_DEFAULTS.subjectTemplate, {
      readingName: "Birth Chart",
    });
    expect(subject).toBe("Your Birth Chart reading is ready");
  });
});
