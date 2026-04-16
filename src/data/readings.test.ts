import { describe, expect, it } from "vitest";

import { getReadingById, getRequiredDetails, READINGS, TESTIMONIALS } from "./readings";

describe("readings data", () => {
  it("has three readings", () => {
    expect(READINGS).toHaveLength(3);
  });

  it("each reading has required fields", () => {
    for (const reading of READINGS) {
      expect(reading.id).toBeTruthy();
      expect(reading.name).toBeTruthy();
      expect(reading.price).toMatch(/^\$/);
      expect(reading.includes.length).toBeGreaterThan(0);
      expect(reading.expandedDetails.length).toBeGreaterThan(0);
    }
  });

  it("reading slugs match expected values", () => {
    const ids = READINGS.map((r) => r.id);
    expect(ids).toEqual(["soul-blueprint", "birth-chart", "akashic-record"]);
  });
});

describe("testimonials data", () => {
  it("has three testimonials", () => {
    expect(TESTIMONIALS).toHaveLength(3);
  });

  it("each testimonial has quote, name, and detail", () => {
    for (const t of TESTIMONIALS) {
      expect(t.quote.length).toBeGreaterThan(0);
      expect(t.name).toBeTruthy();
      expect(t.detail).toBeTruthy();
    }
  });
});

describe("getReadingById", () => {
  it("returns a reading by id", () => {
    const result = getReadingById("soul-blueprint");
    expect(result?.name).toBe("The Soul Blueprint");
  });

  it("returns undefined for unknown id", () => {
    expect(getReadingById("nonexistent")).toBeUndefined();
  });
});

describe("getRequiredDetails", () => {
  it("returns birth chart fields when requiresBirthChart is true", () => {
    const details = getRequiredDetails({
      requiresBirthChart: true,
      requiresAkashic: false,
      requiresQuestions: false,
    });

    expect(details).not.toContain("Full legal name");
    expect(details).toContain("Date of birth");
    expect(details).toContain("Time of birth (as exact as possible)");
    expect(details).toContain("Place of birth");
  });

  it("returns akashic fields when requiresAkashic is true", () => {
    const details = getRequiredDetails({
      requiresBirthChart: false,
      requiresAkashic: true,
      requiresQuestions: false,
    });

    expect(details).toContain("Full legal name");
    expect(details).toContain("A recent photo with your eyes open");
  });

  it("returns questions field when requiresQuestions is true", () => {
    const details = getRequiredDetails({
      requiresBirthChart: false,
      requiresAkashic: false,
      requiresQuestions: true,
    });

    expect(details).toContain("Your three chosen questions");
  });

  it("deduplicates fields across requirements", () => {
    const details = getRequiredDetails({
      requiresBirthChart: true,
      requiresAkashic: true,
      requiresQuestions: true,
    });

    const nameCount = details.filter((d) => d === "Full legal name").length;
    expect(nameCount).toBe(1);
  });

  it("returns empty array when nothing is required", () => {
    const details = getRequiredDetails({
      requiresBirthChart: false,
      requiresAkashic: false,
      requiresQuestions: false,
    });

    expect(details).toEqual([]);
  });
});
