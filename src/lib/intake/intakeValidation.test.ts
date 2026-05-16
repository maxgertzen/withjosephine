import { describe, expect, it } from "vitest";

import { collectFieldErrors, focusFirstError } from "./intakeValidation";

describe("collectFieldErrors", () => {
  it("returns the first issue message per top-level path key", () => {
    const issues = [
      { path: ["fullName"], message: "Please fill this in." },
      { path: ["email"], message: "Please enter your email." },
      { path: ["fullName"], message: "Second error on fullName ignored" },
    ];
    expect(collectFieldErrors(issues)).toEqual({
      fullName: "Please fill this in.",
      email: "Please enter your email.",
    });
  });

  it("ignores issues without a string top-level path", () => {
    const issues = [
      { path: [0], message: "Array root, ignored" },
      { path: ["only_field"], message: "Kept" },
    ];
    expect(collectFieldErrors(issues)).toEqual({ only_field: "Kept" });
  });

  it("returns an empty record when given no issues", () => {
    expect(collectFieldErrors([])).toEqual({});
  });
});

describe("focusFirstError", () => {
  it("focuses the input with id field-<first error key>", () => {
    const form = document.createElement("form");
    const target = document.createElement("input");
    target.id = "field-fullName";
    form.appendChild(target);
    document.body.appendChild(form);

    focusFirstError(form, {
      fullName: "Please fill this in.",
      email: "Later issue",
    });
    expect(document.activeElement).toBe(target);
    form.remove();
  });

  it("is a no-op when there are no errors", () => {
    const form = document.createElement("form");
    document.body.appendChild(form);
    focusFirstError(form, {});
    expect(document.activeElement).toBe(document.body);
    form.remove();
  });

  it("is a no-op when the form ref is null", () => {
    focusFirstError(null, { fullName: "err" });
  });
});
