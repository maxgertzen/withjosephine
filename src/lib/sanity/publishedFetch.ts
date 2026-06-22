import { sanityClient } from "./client";

export const PUBLISHED_REVALIDATE_SECONDS = 300;

/**
 * Published-perspective fetch for statically rendered public pages. Unlike
 * `sanityFetch` (./live.ts) it never reads `draftMode()`, so callers stay
 * static/ISR (prefetchable). Draft preview uses the live path, not this.
 * `stega: false` is load-bearing: the shared client enables stega for visual
 * editing, which would embed invisible characters into production copy.
 */
export async function publishedFetch<T>(options: {
  query: string;
  params?: Record<string, unknown>;
  tags?: string[];
}): Promise<T> {
  const { query, params = {}, tags } = options;
  return sanityClient.fetch<T>(query, params, {
    perspective: "published",
    stega: false,
    next: { revalidate: PUBLISHED_REVALIDATE_SECONDS, tags },
  });
}
