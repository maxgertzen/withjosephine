import { defineLive } from "next-sanity/live";

import { sanityClient } from "./client";

/**
 * Live content layer for the App Router.
 *
 * `sanityFetch` automatically:
 *   - Switches to the `drafts` perspective when `draftMode()` is enabled
 *     (so Josephine sees unpublished edits inside Studio Presentation).
 *   - Tags responses so `<SanityLive />` can revalidate them when content
 *     changes in Sanity, without a manual refresh.
 *
 * `serverToken` is required for the server to subscribe to Sanity's live
 * EventSource. We deliberately omit `browserToken` so the read token is never
 * shipped in the client bundle — live updates still flow because the server
 * receives them and revalidates the relevant cache tags.
 */
const live = defineLive({
  client: sanityClient,
  serverToken: process.env.SANITY_READ_TOKEN,
});

export const SanityLive = live.SanityLive;

/**
 * Typed `sanityFetch` wrapper. `next-sanity` v12+'s underlying
 * `DefinedFetchType.data` resolves to `ClientReturn<QueryString, unknown>`,
 * which falls through to `unknown` for queries that haven't been registered
 * via Sanity TypeGen. Until we adopt TypeGen, hand-typing each call here
 * keeps the casting out of business logic — every wrapper in `./fetch.ts`
 * supplies the expected return shape and the rest of the codebase stays
 * type-safe without per-call assertions.
 */
type SanityFetchOptions = Parameters<typeof live.sanityFetch>[0];
type SanityFetchResult<T> = {
  data: T;
  sourceMap: Awaited<ReturnType<typeof live.sanityFetch>>["sourceMap"];
  tags: Awaited<ReturnType<typeof live.sanityFetch>>["tags"];
};

export async function sanityFetch<T>(options: SanityFetchOptions): Promise<SanityFetchResult<T>> {
  const result = await live.sanityFetch(options);
  return result as SanityFetchResult<T>;
}
