import { describe, expect, it } from "vitest";

import { sanityImageUrl } from "./imageUrl";

describe("sanityImageUrl", () => {
  it("adds size and auto format to a Sanity CDN image", () => {
    expect(
      sanityImageUrl("https://cdn.sanity.io/images/p/d/a.png", { w: 80, h: 80, fit: "crop" }),
    ).toBe("https://cdn.sanity.io/images/p/d/a.png?w=80&h=80&fit=crop&auto=format");
  });

  it("leaves a local image unchanged", () => {
    expect(sanityImageUrl("/images/akasha.webp", { w: 80 })).toBe("/images/akasha.webp");
  });
});
