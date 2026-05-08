import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { IntakePage } from "@/lib/booking/derivePages";
import type { SanityFormField, SanityFormSection } from "@/lib/sanity/types";

import { ReviewSummary } from "./ReviewSummary";

function field(partial: Partial<SanityFormField> & { key: string; type: SanityFormField["type"] }): SanityFormField {
  return {
    _id: `f-${partial.key}`,
    label: partial.key,
    required: false,
    ...partial,
  } as SanityFormField;
}

function section(
  id: string,
  title: string,
  fields: SanityFormField[],
  marginalia?: string,
): SanityFormSection {
  return {
    _id: id,
    sectionTitle: title,
    marginaliaLabel: marginalia,
    fields,
  };
}

describe("ReviewSummary", () => {
  it("renders nothing when not on the final page", () => {
    const pages: IntakePage[] = [
      [section("s1", "Your name", [field({ key: "first_name", type: "shortText", label: "First name" })])],
      [section("s2", "Your story", [field({ key: "anything_else", type: "longText", label: "Anything else" })])],
    ];
    const { container } = render(
      <ReviewSummary
        pages={pages}
        values={{ first_name: "Jane", anything_else: "" }}
        currentPageIndex={0}
        onEdit={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no previous pages (single-page form)", () => {
    const pages: IntakePage[] = [
      [section("s1", "Just one page", [field({ key: "name", type: "shortText", label: "Name" })])],
    ];
    const { container } = render(
      <ReviewSummary pages={pages} values={{ name: "Jane" }} currentPageIndex={0} onEdit={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one card per non-empty section across previous pages", () => {
    const pages: IntakePage[] = [
      [section("s1", "Your name", [field({ key: "first_name", type: "shortText", label: "First name" })])],
      [section("s2", "Your birth", [field({ key: "dob", type: "date", label: "Date of birth" })])],
      [section("s3", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ first_name: "Jane", dob: "1995-05-08", consent: true }}
        currentPageIndex={2}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: "Your name" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your birth" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Final" })).not.toBeInTheDocument();
  });

  it("displays the section's marginalia label when present", () => {
    const pages: IntakePage[] = [
      [
        section(
          "s1",
          "Your name",
          [field({ key: "first_name", type: "shortText", label: "First name" })],
          "Page 1",
        ),
      ],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ first_name: "Jane", consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  });

  it("skips consent fields, _unknown time companions, and _geonameid place companions", () => {
    const pages: IntakePage[] = [
      [
        section("s1", "Birth", [
          field({ key: "birth_time", type: "time", label: "Birth time" }),
          field({ key: "birth_time_unknown", type: "consent", label: "I don't know my birth time" }),
          field({ key: "birth_place", type: "placeAutocomplete", label: "Birth place" }),
          field({ key: "birth_place_geonameid", type: "shortText", label: "Geoname ID" }),
          field({ key: "newsletter", type: "consent", label: "Subscribe" }),
        ]),
      ],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{
          birth_time: "06:30",
          birth_time_unknown: false,
          birth_place: "Lisbon, Portugal",
          birth_place_geonameid: "2267057",
          newsletter: true,
          consent: true,
        }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("Birth time")).toBeInTheDocument();
    expect(screen.getByText("Birth place")).toBeInTheDocument();
    expect(screen.queryByText("I don't know my birth time")).not.toBeInTheDocument();
    expect(screen.queryByText("Geoname ID")).not.toBeInTheDocument();
    expect(screen.queryByText("Subscribe")).not.toBeInTheDocument();
  });

  it("renders empty values as a muted placeholder", () => {
    const pages: IntakePage[] = [
      [section("s1", "Your story", [field({ key: "anything_else", type: "longText", label: "Anything else" })])],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ anything_else: "", consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders select values as the option label, not the raw key", () => {
    const pages: IntakePage[] = [
      [
        section("s1", "Pronouns", [
          field({
            key: "pronouns",
            type: "select",
            label: "Pronouns",
            options: [
              { value: "she_her", label: "She / her" },
              { value: "they_them", label: "They / them" },
            ],
          }),
        ]),
      ],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ pronouns: "they_them", consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("They / them")).toBeInTheDocument();
    expect(screen.queryByText("they_them")).not.toBeInTheDocument();
  });

  it("renders multiSelectExact values as a list of option labels in selection order", () => {
    const pages: IntakePage[] = [
      [
        section("s1", "Themes", [
          field({
            key: "themes",
            type: "multiSelectExact",
            label: "Themes",
            options: [
              { value: "love", label: "Love" },
              { value: "career", label: "Career" },
              { value: "family", label: "Family" },
            ],
          }),
        ]),
      ],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ themes: ["career", "love"], consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Career", "Love"]);
  });

  it("renders date values in a human-friendly format without timezone shift", () => {
    const pages: IntakePage[] = [
      [section("s1", "Birth", [field({ key: "dob", type: "date", label: "Date of birth" })])],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ dob: "1995-05-08", consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    // toLocaleDateString in a US locale yields "May 8, 1995" — never May 7.
    expect(screen.getByText("May 8, 1995")).toBeInTheDocument();
  });

  it("renders 'Time unknown' when the _unknown companion is true", () => {
    const pages: IntakePage[] = [
      [
        section("s1", "Birth", [
          field({ key: "birth_time", type: "time", label: "Birth time" }),
          field({ key: "birth_time_unknown", type: "consent", label: "Unknown" }),
        ]),
      ],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ birth_time: "", birth_time_unknown: true, consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    expect(screen.getByText("Time unknown")).toBeInTheDocument();
  });

  it("renders fileUpload values as a thumbnail using the R2 public URL base", () => {
    const r2Key = "submissions/abc/photo.jpg";
    const pages: IntakePage[] = [
      [section("s1", "Photo", [field({ key: "photo", type: "fileUpload", label: "Photo" })])],
      [section("s2", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    render(
      <ReviewSummary
        pages={pages}
        values={{ photo: r2Key, consent: false }}
        currentPageIndex={1}
        onEdit={() => {}}
      />,
    );
    const img = screen.getByRole("img", { name: /Photo preview/i });
    expect(img).toHaveAttribute("src", `https://images.withjosephine.com/${r2Key}`);
  });

  it("invokes onEdit with the section's page index when Edit is clicked", () => {
    const pages: IntakePage[] = [
      [section("s1", "Your name", [field({ key: "first_name", type: "shortText", label: "First name" })])],
      [section("s2", "Your birth", [field({ key: "dob", type: "date", label: "Date of birth" })])],
      [section("s3", "Final", [field({ key: "consent", type: "consent", label: "I agree" })])],
    ];
    const onEdit = vi.fn();
    render(
      <ReviewSummary
        pages={pages}
        values={{ first_name: "Jane", dob: "1995-05-08", consent: true }}
        currentPageIndex={2}
        onEdit={onEdit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit Your birth" }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });
});
