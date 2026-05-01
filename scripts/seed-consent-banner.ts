// Seed the siteSettings.consentBanner object with initial values matching
// the codebase fallback defaults. Idempotent: skips fields Josephine has
// already filled in Studio.
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/seed-consent-banner.ts
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const SEED = {
  title: "A note on analytics",
  body:
    "We use Mixpanel to understand how visitors move through the booking flow so we can keep improving it. No personal information is shared.",
  privacyLinkText: "Read the privacy policy",
  acceptLabel: "Accept",
  declineLabel: "Decline",
};

type ConsentBannerDoc = {
  _id: string;
  consentBanner?: {
    title?: string;
    body?: string;
    privacyLinkText?: string;
    acceptLabel?: string;
    declineLabel?: string;
  };
};

async function main() {
  const doc = await client.fetch<ConsentBannerDoc | null>(
    '*[_type == "siteSettings"][0]{ _id, consentBanner }',
  );
  if (!doc) {
    throw new Error("siteSettings document not found");
  }

  const existing = doc.consentBanner ?? {};
  const merged = { ...SEED, ...existing };
  const changed = Object.keys(SEED).some(
    (key) => existing[key as keyof typeof SEED] == null,
  );

  if (!changed) {
    console.log("consentBanner already populated; nothing to do.");
    return;
  }

  console.log(`Seeding consentBanner on ${doc._id}...`);
  await client.patch(doc._id).set({ consentBanner: merged }).commit();

  const verify = await client.fetch<ConsentBannerDoc>(
    `*[_id == $id][0]{ _id, consentBanner }`,
    { id: doc._id },
  );
  if (!verify.consentBanner?.title) {
    throw new Error("consentBanner not present after patch");
  }
  console.log("Verified: consentBanner seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
