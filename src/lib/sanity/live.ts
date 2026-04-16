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
export const { sanityFetch, SanityLive } = defineLive({
  client: sanityClient,
  serverToken: process.env.SANITY_READ_TOKEN,
});
