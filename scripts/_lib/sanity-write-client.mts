import { createClient, type SanityClient } from "@sanity/client";

export type SanityClientOptions = {
  apiVersion?: string;
  dataset?: string;
  readOnly?: boolean;
};

const DEFAULT_API_VERSION = "2025-01-01";

export function sanityWriteClient(options: SanityClientOptions = {}): SanityClient {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set");
  }

  const dataset =
    options.dataset ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const apiVersion = options.apiVersion ?? DEFAULT_API_VERSION;

  if (options.readOnly) {
    return createClient({ projectId, dataset, apiVersion, useCdn: false });
  }

  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) {
    throw new Error("SANITY_WRITE_TOKEN is not set");
  }

  return createClient({ projectId, dataset, apiVersion, useCdn: false, token });
}
