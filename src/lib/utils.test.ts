import { describe, expect, it } from "vitest";

import { escapeHtml, mergeClasses } from "./utils";

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double and single quotes", () => {
    expect(escapeHtml(`"hello" 'world'`)).toBe("&quot;hello&quot; &#39;world&#39;");
  });

  it("returns plain strings unchanged", () => {
    expect(escapeHtml("plain text 123")).toBe("plain text 123");
  });
});

describe("mergeClasses", () => {
  it("merges class strings", () => {
    expect(mergeClasses("a", "b")).toBe("a b");
  });

  it("resolves Tailwind conflicts via twMerge", () => {
    expect(mergeClasses("p-2", "p-4")).toBe("p-4");
  });

  it("ignores falsy values", () => {
    expect(mergeClasses("a", false, null, undefined, "b")).toBe("a b");
  });
});
