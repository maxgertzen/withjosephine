// Rewrite `siteSettings.consentBanner.body` so it mentions both Mixpanel and
// Microsoft Clarity. Clarity is consent-gated via the Consent v2 API in
// EU/EEA/UK/CH, so the banner must disclose it before a visitor can give
// informed consent. Title / link text / button labels are preserved as-is.
//
// Idempotency:
//   - If the live body already contains "Clarity", exits no-op.
//   - If the live body matches the original seeded text, replaces it with the
//     new canonical text.
//   - If the live body has been edited away from the seed AND does not mention
//     Clarity, the script REFUSES to overwrite and prints a manual-update note.
//     This protects copy Becky has already tuned in Studio from being clobbered.
//
// Run: set -a && source .env.local && set +a && pnpm tsx scripts/migrate-consent-banner-clarity.ts
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

// Must match the value seeded by `seed-consent-banner.ts`; if it diverges,
// detection of "Becky hasn't edited yet" silently fails. Keep in sync.
const SEED_BODY =
  "We use Mixpanel to understand how visitors move through the booking flow so we can keep improving it. No personal information is shared.";

const NEW_BODY =
  "We use Mixpanel and Microsoft Clarity to understand how visitors move through the booking flow so we can keep improving it. No personal information is shared.";

type ConsentBannerDoc = {
  _id: string;
  consentBanner?: {
    title?: string;
    body?: string;
    privacyLinkText?: string;
    acceptLabel?: string;
    declineLabel?: string;
    hideInPreview?: boolean;
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
  const currentBody = existing.body?.trim() ?? "";

  if (currentBody.includes("Clarity")) {
    console.log("Consent banner body already mentions Clarity — nothing to do.");
    return;
  }

  if (currentBody && currentBody !== SEED_BODY.trim()) {
    console.error(
      `Refusing to overwrite consent banner body: it has been edited away from the seed copy.\n\n` +
        `Current body:\n  ${currentBody}\n\n` +
        `Expected canonical update mentions both Mixpanel and Microsoft Clarity. ` +
        `Please update the copy manually in Sanity Studio (Site Settings → Analytics Consent Banner → Body Text) ` +
        `to disclose Microsoft Clarity before the EU/EEA/UK/CH banner can claim Consent v2 compliance.`,
    );
    process.exit(2);
  }

  const merged = { ...existing, body: NEW_BODY };
  console.log(`Patching consent banner body on ${doc._id}...`);
  await client.patch(doc._id).set({ consentBanner: merged }).commit();

  const verify = await client.fetch<ConsentBannerDoc>(
    `*[_id == $id][0]{ _id, consentBanner }`,
    { id: doc._id },
  );
  if (!verify.consentBanner?.body?.includes("Clarity")) {
    throw new Error("Verification failed: 'Clarity' missing from body after patch");
  }
  console.log("Verified: consent banner body now mentions Clarity alongside Mixpanel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
