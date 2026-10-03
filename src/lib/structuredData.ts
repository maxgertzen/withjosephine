import { siteOrigin } from "@/lib/env";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seoMetadata";

const ALTERNATE_NAMES = ["Josephine", "withjosephine"];
const FOUNDER_NAME = "Josephine Rebecca";
const LOGO_PATH = "/images/logo-horizontal.png";

export function organizationJsonLd(input: { sameAs?: string[] } = {}): Record<string, unknown> {
  const origin = siteOrigin();
  const sameAs = input.sameAs ?? [];
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ALTERNATE_NAMES,
    url: origin,
    logo: new URL(LOGO_PATH, origin).toString(),
    founder: { "@type": "Person", name: FOUNDER_NAME },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ALTERNATE_NAMES,
    url: siteOrigin(),
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  image?: string;
}): Record<string, unknown> {
  const origin = siteOrigin();
  const url = new URL(input.path, origin).toString();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    image: new URL(input.image || DEFAULT_OG_IMAGE, origin).toString(),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: { "@type": "Person", name: FOUNDER_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: new URL(LOGO_PATH, origin).toString() },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
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
    brand: { "@type": "Brand", name: SITE_NAME },
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
