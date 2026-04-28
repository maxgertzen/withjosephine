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
});

describe("mergeClasses", () => {
  it("composes clsx + twMerge so Tailwind conflicts resolve and falsy values drop", () => {
    expect(mergeClasses("a", false, null, undefined, "p-2", "p-4", "b")).toBe("a p-4 b");
  });
});
