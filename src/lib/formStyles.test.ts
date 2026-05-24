import { describe, expect, it } from "vitest";

import { errorClasses, errorClassesSmall, inputClasses, invalidBorderClasses } from "./formStyles";

describe("formStyles — bug #2 darker-red contract", () => {
  it("inputClasses composes invalidBorderClasses for the aria-invalid state", () => {
    expect(inputClasses).toContain(invalidBorderClasses);
  });

  it("invalidBorderClasses sets red-700 on both base + focus states", () => {
    expect(invalidBorderClasses).toContain("aria-invalid:border-red-700");
    expect(invalidBorderClasses).toContain("aria-invalid:focus:border-red-700");
  });

  it("errorClasses uses red-700 (darker than the previous red-600)", () => {
    expect(errorClasses).toContain("text-red-700");
    expect(errorClasses).not.toContain("text-red-600");
  });

  it("errorClassesSmall is the text-xs sibling of errorClasses", () => {
    expect(errorClassesSmall).toContain("text-xs");
    expect(errorClassesSmall).toContain("text-red-700");
  });
});
