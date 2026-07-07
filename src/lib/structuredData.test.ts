import { describe, expect, it } from "vitest";

import { organizationJsonLd, readingProductJsonLd, websiteJsonLd } from "@/lib/structuredData";

describe("structuredData", () => {
  it("organizationJsonLd includes name, url, logo, and sameAs", () => {
    const ld = organizationJsonLd(["https://www.tiktok.com/@withjosephine"]);
    expect(ld["@type"]).toBe("Organization");
    expect(ld.url).toBe("https://withjosephine.com");
    expect(ld.logo).toBe("https://withjosephine.com/images/logo-horizontal.png");
    expect(ld.sameAs).toEqual(["https://www.tiktok.com/@withjosephine"]);
  });

  it("organizationJsonLd omits sameAs when there are no links", () => {
    expect(organizationJsonLd()).not.toHaveProperty("sameAs");
  });

  it("websiteJsonLd is a WebSite anchored to the origin", () => {
    const ld = websiteJsonLd();
    expect(ld["@type"]).toBe("WebSite");
    expect(ld.url).toBe("https://withjosephine.com");
  });

  it("readingProductJsonLd derives a numeric Offer price from a display string", () => {
    const ld = readingProductJsonLd({
      name: "Soul Blueprint",
      description: "A signature reading.",
      price: "$129",
      path: "/book/soul-blueprint",
    });
    const offers = ld.offers as { price: string; priceCurrency: string; availability: string };

    expect(ld["@type"]).toBe("Product");
    expect(ld.url).toBe("https://withjosephine.com/book/soul-blueprint");
    expect(offers.price).toBe("129");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
  });
});
