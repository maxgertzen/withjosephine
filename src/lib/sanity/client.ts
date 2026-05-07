import { createClient, type SanityClient } from "next-sanity";

import { requireEnv } from "../env";
import { taintServerObject } from "../taint";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2025-01-01";

/**
 * `stega.studioUrl` tells the `<VisualEditing />` overlay where to send
 * editors when they click an editable region. Falls back to the local Studio
 * dev URL so visual editing works during `pnpm studio:dev`.
 */
const studioUrl = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "http://localhost:3333";

/**
 * Single shared Sanity client. Perspective (`published` vs `drafts`) is
 * switched per-request by `sanityFetch` in `./live.ts` based on Next.js
 * `draftMode()`. The read token is only attached server-side via
 * `defineLive`'s `serverToken` and the draft-mode handler's
 * `client.withConfig({ token })` — never bundled into the browser.
 */
export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  stega: { studioUrl },
});

/**
 * Write-enabled client used by server routes that create documents (e.g.
 * booking submissions). Lazy so importing this module doesn't blow up in build
 * environments without `SANITY_WRITE_TOKEN` set. `useCdn:false` is required
 * for writes.
 */
let cachedWriteClient: SanityClient | null = null;

export function getSanityWriteClient(): SanityClient {
  if (cachedWriteClient) return cachedWriteClient;
  cachedWriteClient = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: requireEnv("SANITY_WRITE_TOKEN"),
  });
  taintServerObject(
    "Sanity write client carries SANITY_WRITE_TOKEN; do not pass to client components.",
    cachedWriteClient,
  );
  return cachedWriteClient;
}
