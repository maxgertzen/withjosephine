import type { MetadataRoute } from "next";

import { generateReadingStaticParams } from "@/data/readings";
import { siteOrigin } from "@/lib/env";

// Public, indexable surfaces only; noindexed and user-scoped routes are excluded.
const STATIC_PATHS = ["/", "/privacy", "/terms", "/refund-policy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const bookPaths = (await generateReadingStaticParams()).map(
    ({ readingId }) => `/book/${readingId}`,
  );

  return [...STATIC_PATHS, ...bookPaths].map((path) => ({
    url: new URL(path, origin).toString(),
  }));
}
