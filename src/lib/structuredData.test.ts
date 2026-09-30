import { describe, expect, it } from "vitest";

import { organizationJsonLd, readingProductJsonLd, websiteJsonLd } from "@/lib/structuredData";

describe("structuredData", () => {
  it("organizationJsonLd names the brand, its alternates, the founder, and sameAs", () => {
    const ld = organizationJsonLd({ sameAs: ["https://www.tiktok.com/@withjosephine"] });
    expect(ld["@type"]).toBe("Organization");
    expect(ld.name).toBe("Josephine Soul Readings");
    expect(ld.alternateName).toEqual(["Josephine", "withjosephine"]);
    expect(ld.founder).toEqual({ "@type": "Person", name: "Josephine Rebecca" });
    expect(ld.url).toBe("https://withjosephine.com");
    expect(ld.logo).toBe("https://withjosephine.com/images/logo-horizontal.png");
    expect(ld.sameAs).toEqual(["https://www.tiktok.com/@withjosephine"]);
  });

  it("organizationJsonLd omits sameAs when unset", () => {
    expect(organizationJsonLd()).not.toHaveProperty("sameAs");
  });

  it("websiteJsonLd carries the brand name and alternates, anchored to the origin", () => {
    expect(websiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Josephine Soul Readings",
      alternateName: ["Josephine", "withjosephine"],
      url: "https://withjosephine.com",
    });
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
    expect(ld.brand).toEqual({ "@type": "Brand", name: "Josephine Soul Readings" });
    expect(offers.price).toBe("129");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.availability).toBe("https://schema.org/InStock");
  });
});
