import type { Metadata } from "next";

import { siteOrigin } from "@/lib/env";
import type { SanitySeo } from "@/lib/sanity/types";

export const SITE_NAME = "Josephine — Soul Readings";
export const DEFAULT_OG_IMAGE = "/og-image.png";

export function buildOpenGraph(seo: SanitySeo | undefined): Metadata["openGraph"] {
  const ogImageUrl = seo?.ogImage?.asset?.url;
  if (!ogImageUrl) return undefined;
  return { images: [{ url: ogImageUrl }] };
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  seo?: SanitySeo;
}): Pick<Metadata, "title" | "description" | "alternates" | "openGraph" | "twitter"> {
  const { title, description, path, seo } = input;
  const url = new URL(path, siteOrigin()).toString();
  const imageUrl = seo?.ogImage?.asset?.url ?? DEFAULT_OG_IMAGE;
  const images = [{ url: imageUrl, width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url, type: "website", siteName: SITE_NAME, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
