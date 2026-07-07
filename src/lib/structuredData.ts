import { siteOrigin } from "@/lib/env";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seoMetadata";

const BRAND_NAME = "Josephine";
const LOGO_PATH = "/images/logo-horizontal.png";

export function organizationJsonLd(input: { name?: string; sameAs?: string[] } = {}): Record<
  string,
  unknown
> {
  const origin = siteOrigin();
  const sameAs = input.sameAs ?? [];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name || SITE_NAME,
    url: origin,
    logo: new URL(LOGO_PATH, origin).toString(),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteJsonLd(name?: string): Record<string, unknown> {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: name || SITE_NAME,
    url: origin,
  };
}

export function readingProductJsonLd(input: {
  name: string;
  description: string;
  price: string;
  path: string;
  image?: string;
}): Record<string, unknown> {
  const origin = siteOrigin();
  const url = new URL(input.path, origin).toString();
  const image = new URL(input.image || DEFAULT_OG_IMAGE, origin).toString();
  const price = input.price.replace(/[^0-9.]/g, "");
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    image,
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
