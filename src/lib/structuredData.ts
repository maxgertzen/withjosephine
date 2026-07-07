import { siteOrigin } from "@/lib/env";
import { SITE_NAME } from "@/lib/seoMetadata";

const BRAND_NAME = "Josephine";
const LOGO_PATH = "/images/logo-horizontal.png";

export function organizationJsonLd(sameAs: string[] = []): Record<string, unknown> {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: origin,
    logo: new URL(LOGO_PATH, origin).toString(),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: origin,
  };
}

export function readingProductJsonLd(input: {
  name: string;
  description: string;
  price: string;
  path: string;
}): Record<string, unknown> {
  const url = new URL(input.path, siteOrigin()).toString();
  const price = input.price.replace(/[^0-9.]/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    brand: { "@type": "Brand", name: BRAND_NAME },
    url,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url,
    },
  };
}
