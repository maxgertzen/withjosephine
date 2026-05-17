import { describe, expect, it } from "vitest";

import { stripTemplateTags } from "../giftPersonas";

// Phase 5 Session 4b — B7.26. Closes the template-tag injection vector.
describe("stripTemplateTags", () => {
  it("strips a single `{tag}` substring", () => {
    expect(stripTemplateTags("Hi {recipientName}, congrats")).toBe("Hi , congrats");
  });

  it("strips multiple `{tag}` substrings", () => {
    expect(
      stripTemplateTags("{purchaserFirstName} sent {recipientName} a gift {amount}"),
    ).toBe("sent  a gift");
  });

  it("strips empty `{}` and unbalanced patterns", () => {
    expect(stripTemplateTags("a {} b")).toBe("a  b");
    expect(stripTemplateTags("a {unclosed")).toBe("a {unclosed");
  });

  it("leaves regular text alone", () => {
    expect(stripTemplateTags("Alice")).toBe("Alice");
    expect(stripTemplateTags("happy birthday <3")).toBe("happy birthday <3");
  });

  it("trims trailing/leading whitespace after stripping", () => {
    expect(stripTemplateTags("{tag}")).toBe("");
    expect(stripTemplateTags("  {tag} hi {tag2}  ")).toBe("hi");
  });
});
