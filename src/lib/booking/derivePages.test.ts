import { describe, expect, it } from "vitest";

import type { SanityFormSection } from "@/lib/sanity/types";

import { derivePages } from "./derivePages";

function section(id: string, opts: Partial<SanityFormSection> = {}): SanityFormSection {
  return {
    _id: id,
    sectionTitle: id,
    fields: [],
    ...opts,
  };
}

describe("derivePages", () => {
  it("returns empty list when no sections are provided", () => {
    expect(derivePages([])).toEqual([]);
  });

  it("groups all sections into a single page when no boundaries are set", () => {
    const pages = derivePages([section("a"), section("b"), section("c")]);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(3);
  });

  it("starts a new page each time pageBoundary is true", () => {
    const pages = derivePages([
      section("a"),
      section("b", { pageBoundary: true }),
      section("c"),
      section("d", { pageBoundary: true }),
      section("e"),
    ]);
    expect(pages).toHaveLength(3);
    expect(pages[0].map((p) => p._id)).toEqual(["a"]);
    expect(pages[1].map((p) => p._id)).toEqual(["b", "c"]);
    expect(pages[2].map((p) => p._id)).toEqual(["d", "e"]);
  });

  it("ignores leading pageBoundary on the first section", () => {
    const pages = derivePages([
      section("a", { pageBoundary: true }),
      section("b"),
    ]);
    expect(pages).toHaveLength(1);
    expect(pages[0].map((p) => p._id)).toEqual(["a", "b"]);
  });

  it("collapses pages when pagination override clamps to a smaller count", () => {
    const pages = derivePages(
      [
        section("a"),
        section("b", { pageBoundary: true }),
        section("c"),
        section("d", { pageBoundary: true }),
        section("e"),
      ],
      {
        readingSlug: "soul-blueprint",
        pagination: {
          overrides: [{ readingSlug: "soul-blueprint", pageCount: 2 }],
        },
      },
    );

    expect(pages).toHaveLength(2);
    expect(pages[0].map((p) => p._id)).toEqual(["a"]);
    expect(pages[1].map((p) => p._id)).toEqual(["b", "c", "d", "e"]);
  });

  it("ignores override when readingSlug does not match", () => {
    const pages = derivePages(
      [section("a"), section("b", { pageBoundary: true }), section("c")],
      {
        readingSlug: "akashic-record",
        pagination: {
          overrides: [{ readingSlug: "soul-blueprint", pageCount: 1 }],
        },
      },
    );
    expect(pages).toHaveLength(2);
  });

  it("ignores override when pageCount exceeds derived count", () => {
    const pages = derivePages(
      [section("a"), section("b", { pageBoundary: true })],
      {
        readingSlug: "soul-blueprint",
        pagination: {
          overrides: [{ readingSlug: "soul-blueprint", pageCount: 99 }],
        },
      },
    );
    expect(pages).toHaveLength(2);
  });
});
