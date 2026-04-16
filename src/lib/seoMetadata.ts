import type { Metadata } from "next";
import type { SanitySeo } from "@/lib/sanity/types";

export function buildOpenGraph(seo: SanitySeo | undefined): Metadata["openGraph"] {
  const ogImageUrl = seo?.ogImage?.asset?.url;
  if (!ogImageUrl) return undefined;
  return { images: [{ url: ogImageUrl }] };
}
