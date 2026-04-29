import { describe, expect, it } from "vitest";

import type { SanityFormField, SanityFormSection } from "@/lib/sanity/types";

import { filterSectionsForReading, flattenActiveFields } from "./sectionFilters";

function field(key: string, services?: string[]): SanityFormField {
  return {
    _id: `f-${key}`,
    key,
    label: key,
    type: "shortText",
    appliesToServices: services,
  };
}

function section(id: string, fields: SanityFormField[], services?: string[]): SanityFormSection {
  return {
    _id: id,
    sectionTitle: id,
    fields,
    appliesToServices: services,
  };
}

describe("section filters", () => {
  const sections: SanityFormSection[] = [
    section("all", [field("name"), field("birthChartOnly", ["birth-chart"])]),
    section(
      "akashic-only",
      [field("question")],
      ["akashic-record"],
    ),
  ];

  it("keeps sections without service restrictions and filters fields by reading", () => {
    const result = filterSectionsForReading(sections, "soul-blueprint");
    expect(result).toHaveLength(1);
    expect(result[0]?.fields.map((f) => f.key)).toEqual(["name"]);
  });

  it("includes service-specific sections for matching reading", () => {
    const result = filterSectionsForReading(sections, "akashic-record");
    expect(result.map((s) => s._id)).toContain("akashic-only");
  });

  it("drops sections with no remaining fields after filtering", () => {
    const onlyOptional = [
      section("opt", [field("planet", ["birth-chart"])]),
    ];
    expect(filterSectionsForReading(onlyOptional, "soul-blueprint")).toHaveLength(0);
  });

  it("flattenActiveFields returns the unioned field list for a reading", () => {
    const keys = flattenActiveFields(sections, "birth-chart").map((f) => f.key);
    expect(keys).toContain("name");
    expect(keys).toContain("birthChartOnly");
  });
});
