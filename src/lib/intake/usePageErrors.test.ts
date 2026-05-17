import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SanityFormField } from "@/lib/sanity/types";

import { usePageErrors } from "./usePageErrors";

const FIELDS: SanityFormField[] = [
  { _id: "f-name", key: "fullName", label: "Full name", type: "shortText", required: true },
  { _id: "f-email", key: "email", label: "Email", type: "email", required: true },
  { _id: "f-dob", key: "dob", label: "Date of birth", type: "date", required: true },
];

describe("usePageErrors", () => {
  it("returns empty pageErrors when all required fields are valid", () => {
    const { result } = renderHook(() =>
      usePageErrors({
        allFields: FIELDS,
        currentKeys: ["fullName", "email", "dob"],
        values: { fullName: "Alex", email: "a@b.co", dob: "1990-01-01" },
      }),
    );
    expect(result.current.pageErrors).toEqual({});
    expect(result.current.firstErrorKey).toBeNull();
    expect(result.current.firstFieldLabel).toBeNull();
    expect(result.current.errorCount).toBe(0);
  });

  it("captures per-key errors when required fields are missing", () => {
    const { result } = renderHook(() =>
      usePageErrors({
        allFields: FIELDS,
        currentKeys: ["fullName", "email", "dob"],
        values: { fullName: "", email: "", dob: "" },
      }),
    );
    expect(Object.keys(result.current.pageErrors).sort()).toEqual([
      "dob",
      "email",
      "fullName",
    ]);
    expect(result.current.errorCount).toBe(3);
  });

  it("returns firstErrorKey in page (currentKeys) order, not Zod issue order", () => {
    const { result } = renderHook(() =>
      usePageErrors({
        allFields: FIELDS,
        currentKeys: ["fullName", "email", "dob"],
        values: { fullName: "Alex", email: "", dob: "" },
      }),
    );
    expect(result.current.firstErrorKey).toBe("email");
    expect(result.current.firstFieldLabel).toBe("Email");
  });

});
