import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SanityFormSection } from "@/lib/sanity/types";

import { useIntakeSchema } from "./useIntakeSchema";

const SECTIONS_SINGLE_PAGE: SanityFormSection[] = [
  {
    _id: "sec-1",
    sectionTitle: "About",
    fields: [
      { _id: "f-name", key: "fullName", label: "Full name", type: "shortText", required: true },
      { _id: "f-email", key: "email", label: "Email", type: "email", required: true },
      {
        _id: "f-time",
        key: "time_of_birth",
        label: "Time of birth",
        type: "time",
        required: true,
      },
      {
        _id: "f-time-unknown",
        key: "time_of_birth_unknown",
        label: "I don't know",
        type: "consent",
        required: false,
      },
      {
        _id: "f-tags",
        key: "favorite_signs",
        label: "Pick 2",
        type: "multiSelectExact",
        multiSelectCount: 2,
        options: [
          { value: "aries", label: "Aries" },
          { value: "leo", label: "Leo" },
          { value: "virgo", label: "Virgo" },
        ],
      },
    ],
  },
];

const SECTIONS_TWO_PAGES: SanityFormSection[] = [
  {
    _id: "sec-1",
    sectionTitle: "About",
    fields: [
      { _id: "f-name", key: "fullName", label: "Full name", type: "shortText", required: true },
    ],
  },
  {
    _id: "sec-2",
    sectionTitle: "Contact",
    pageBoundary: true,
    fields: [
      { _id: "f-email", key: "email", label: "Email", type: "email", required: true },
    ],
  },
];

describe("useIntakeSchema — defaults", () => {
  it("seeds initial values per field type", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_SINGLE_PAGE,
        readingId: "soul-blueprint",
      }),
    );
    expect(result.current.defaultValues.fullName).toBe("");
    expect(result.current.defaultValues.email).toBe("");
    expect(result.current.defaultValues.time_of_birth).toBe("");
    expect(result.current.defaultValues.time_of_birth_unknown).toBe(false);
    expect(result.current.defaultValues.favorite_signs).toEqual([]);
  });

  it("derives a stable defaultValuesSnapshot string", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_SINGLE_PAGE,
        readingId: "soul-blueprint",
      }),
    );
    expect(typeof result.current.defaultValuesSnapshot).toBe("string");
    expect(JSON.parse(result.current.defaultValuesSnapshot)).toEqual(
      result.current.defaultValues,
    );
  });
});

describe("useIntakeSchema — pages derivation", () => {
  it("produces a single page when no pageBoundary set", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_SINGLE_PAGE,
        readingId: "soul-blueprint",
      }),
    );
    expect(result.current.totalPages).toBe(1);
    expect(result.current.pages[0].length).toBe(1);
  });

  it("splits pages on pageBoundary", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_TWO_PAGES,
        readingId: "soul-blueprint",
      }),
    );
    expect(result.current.totalPages).toBe(2);
    expect(result.current.pages[0][0]._id).toBe("sec-1");
    expect(result.current.pages[1][0]._id).toBe("sec-2");
  });

  it("respects pagination overrides for a matching reading slug", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_TWO_PAGES,
        readingId: "soul-blueprint",
        pagination: {
          overrides: [{ readingSlug: "soul-blueprint", pageCount: 1 }],
        },
      }),
    );
    expect(result.current.totalPages).toBe(1);
  });
});

describe("useIntakeSchema — time-unknown companions", () => {
  it("pairs every `_unknown`-suffixed companion with its time field", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_SINGLE_PAGE,
        readingId: "soul-blueprint",
      }),
    );
    expect(result.current.timeUnknownPairs.get("time_of_birth")).toBe(
      "time_of_birth_unknown",
    );
    expect(result.current.pairedUnknownKeys.has("time_of_birth_unknown")).toBe(
      true,
    );
    expect(result.current.timeUnknownLabels.get("time_of_birth")).toBe(
      "I don't know",
    );
  });

  it("does not pair when the companion key is absent", () => {
    const sections: SanityFormSection[] = [
      {
        _id: "sec-1",
        sectionTitle: "About",
        fields: [
          { _id: "f-t", key: "time_of_event", label: "Time", type: "time", required: false },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections,
        readingId: "soul-blueprint",
      }),
    );
    expect(result.current.timeUnknownPairs.size).toBe(0);
  });
});

describe("useIntakeSchema — allFields + submissionSchema", () => {
  it("exposes all fields flattened across sections", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_SINGLE_PAGE,
        readingId: "soul-blueprint",
      }),
    );
    expect(result.current.allFields.map((f) => f.key)).toEqual([
      "fullName",
      "email",
      "time_of_birth",
      "time_of_birth_unknown",
      "favorite_signs",
    ]);
  });

  it("submissionSchema accepts valid values + rejects missing required field", () => {
    const { result } = renderHook(() =>
      useIntakeSchema({
        sections: SECTIONS_SINGLE_PAGE,
        readingId: "soul-blueprint",
      }),
    );
    expect(
      result.current.submissionSchema.safeParse({
        fullName: "Ada",
        email: "ada@example.com",
        time_of_birth: "12:34",
        favorite_signs: ["aries", "leo"],
      }).success,
    ).toBe(true);
    expect(
      result.current.submissionSchema.safeParse({
        fullName: "",
        email: "ada@example.com",
        time_of_birth: "12:34",
        favorite_signs: ["aries", "leo"],
      }).success,
    ).toBe(false);
  });
});
