import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient, type SanityClient } from "next-sanity";

import { requireEnv } from "../env";
import { taintServerObject } from "../taint";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const buildBakedDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2025-01-01";

const apiHost = process.env.SANITY_API_HOST;
const hostOverride = apiHost ? { apiHost, useCdn: false, useProjectHostname: false } : {};

/**
 * `NEXT_PUBLIC_SANITY_DATASET` is inlined as a string literal at build time by
 * Next.js's DefinePlugin. A manual `wrangler deploy --env staging` from a dev
 * machine whose `.env.local` carries the wrong dataset bakes that value and
 * deploys it to the staging worker — silently mirroring submissions into the
 * production dataset (2026-05-25 incident).
 *
 * For write operations (which must hit the correct dataset or the booking
 * disappears as far as Studio is concerned), read the dataset name from the
 * Cloudflare runtime env. `wrangler.jsonc` declares the per-env value as a
 * worker var, which is the authoritative runtime source-of-truth.
 *
 * Falls back to the build-baked value when CF context is unavailable (vitest,
 * scripts, build-time) — tests stub the client anyway, and the baked value is
 * correct for the env Next was built in.
 */
async function resolveDataset(): Promise<string> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const runtime = (env as { NEXT_PUBLIC_SANITY_DATASET?: string })
      ?.NEXT_PUBLIC_SANITY_DATASET;
    if (runtime) return runtime;
  } catch {
    // No CF runtime context — fall through to the build-baked value.
  }
  return buildBakedDataset;
}

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
  dataset: buildBakedDataset,
  apiVersion,
  useCdn: true,
  stega: { studioUrl },
  ...hostOverride,
});

/**
 * Write-enabled client used by server routes that create documents (e.g.
 * booking submissions). Lazy so importing this module doesn't blow up in build
 * environments without `SANITY_WRITE_TOKEN` set. `useCdn:false` is required
 * for writes.
 *
 * Async + per-dataset cache because the dataset is resolved at runtime from
 * `getCloudflareContext().env.NEXT_PUBLIC_SANITY_DATASET` rather than the
 * build-baked literal. See `resolveDataset` above. Cache is keyed by dataset
 * so the worker isolate never holds more than one client per dataset (in
 * practice always one — workers don't cross datasets within a request).
 */
const cachedWriteClientsByDataset = new Map<string, SanityClient>();

export async function getSanityWriteClient(): Promise<SanityClient> {
  const dataset = await resolveDataset();
  const cached = cachedWriteClientsByDataset.get(dataset);
  if (cached) return cached;
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: requireEnv("SANITY_WRITE_TOKEN"),
    ...hostOverride,
  });
  taintServerObject(
    "Sanity write client carries SANITY_WRITE_TOKEN; do not pass to client components.",
    client,
  );
  cachedWriteClientsByDataset.set(dataset, client);
  return client;
}

/**
 * Read client for transactional email copy. Do NOT route these through
 * `sanityFetch`: emails send from cron/DO/webhook contexts where the live path's
 * tag revalidation never runs (`<SanityLive>` only revalidates in a browser
 * request), so it serves a stale template (2026-07-05: a Studio edit shipped with
 * pre-edit copy). Direct `.fetch` + `useCdn:false` + `perspective:"published"`
 * always reflects the latest publish; `stega:false` keeps visual-editing markers
 * out of the HTML. Read token attached so a private dataset can't 401 the send
 * into the code defaults.
 */
const cachedFreshReadClientsByDataset = new Map<string, SanityClient>();

export async function getSanityFreshReadClient(): Promise<SanityClient> {
  const dataset = await resolveDataset();
  const cached = cachedFreshReadClientsByDataset.get(dataset);
  if (cached) return cached;
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    perspective: "published",
    stega: false,
    token: process.env.SANITY_READ_TOKEN,
    ...hostOverride,
  });
  cachedFreshReadClientsByDataset.set(dataset, client);
  return client;
}
