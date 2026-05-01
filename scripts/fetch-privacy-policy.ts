/**
 * Read-only inspection of the live `legalPage` document with slug
 * `privacy`. Used before any modification to confirm what's actually
 * in Sanity right now (the source of truth) — see the project's
 * "fetch from Sanity origin first" rule.
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm tsx scripts/fetch-privacy-policy.ts
 */
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

async function main() {
  const doc = await client.fetch<unknown>(
    '*[_type == "legalPage" && slug.current == "privacy"][0]',
  );
  if (!doc) {
    console.log("No privacy legalPage found.");
    return;
  }
  console.log(JSON.stringify(doc, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
