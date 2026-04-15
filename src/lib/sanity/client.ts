import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2025-01-01";

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

/**
 * Server-only preview client. Reads `previewDrafts` perspective using the
 * Sanity read token — MUST NEVER be imported into a client component.
 *
 * Selected by `src/lib/sanity/fetch.ts#getClient()` when `draftMode()` is
 * enabled for the current request (i.e. the viewer has a valid preview
 * cookie set by `/api/draft/enable`).
 */
export const sanityPreviewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: "previewDrafts",
  token: process.env.SANITY_READ_TOKEN,
});
