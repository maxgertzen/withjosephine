import { describe, expect, it } from "vitest";

import { organizationJsonLd, readingProductJsonLd, websiteJsonLd } from "@/lib/structuredData";

describe("structuredData", () => {
  it("organizationJsonLd includes name, url, logo, and sameAs", () => {
    const ld = organizationJsonLd({
      name: "Josephine",
      sameAs: ["https://www.tiktok.com/@withjosephine"],
    });
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Josephine");
    expect(ld.url).toBe("https://withjosephine.com");
    expect(ld.logo).toBe("https://withjosephine.com/images/logo-horizontal.png");
    expect(ld.sameAs).toEqual(["https://www.tiktok.com/@withjosephine"]);
  });

  it("organizationJsonLd falls back to the site name and omits sameAs when unset", () => {
    const ld = organizationJsonLd();
    expect(ld.name).toBe("Josephine — Soul Readings");
    expect(ld).not.toHaveProperty("sameAs");
  });

  it("websiteJsonLd uses the given name and is anchored to the origin", () => {
    expect(websiteJsonLd("Josephine")).toMatchObject({
      "@type": "WebSite",
      name: "Josephine",
      url: "https://withjosephine.com",
    });
    expect(websiteJsonLd().name).toBe("Josephine — Soul Readings");
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
    expect(ld.image).toBe("https://withjosephine.com/og-image.png");
    expect(offers.price).toBe("129");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
  });
});
