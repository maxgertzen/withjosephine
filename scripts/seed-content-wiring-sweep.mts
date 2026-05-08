/**
 * Seed defaults for the content-wiring sweep PR.
 *
 * Idempotent — uses `setIfMissing` so nothing already authored is clobbered.
 * Run for each dataset:
 *   pnpm tsx scripts/seed-content-wiring-sweep.mts production
 *   pnpm tsx scripts/seed-content-wiring-sweep.mts staging
 */
import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "production";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const CONTACT_EMAIL = "hello@withjosephine.com";

const FORMAT_NOTE = "A spoken voice note plus a written PDF you can keep.";

const THANK_YOU_DEFAULTS = {
  readingLabel: "Your Reading",
  confirmationBody:
    "A confirmation email is on its way to your inbox in the next minute or two — it includes a copy of the answers you shared so you have them on hand. If you can’t find it, please check your promotions folder.",
  timelineBody:
    "I’ll begin your reading within the next two days, and I’ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.",
  deliveryDaysPhrase: "seven days",
  contactBody:
    "If anything comes up — a question, a detail you forgot to mention, or anything that doesn’t look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.",
};

async function seedSingleton(
  type: string,
  values: Record<string, unknown>,
): Promise<void> {
  const id = await client.fetch<string | null>(`*[_type == $type][0]._id`, { type });
  if (!id) {
    console.log(`[${dataset}] ${type}: no document, skipping.`);
    return;
  }
  const result = await client.patch(id).setIfMissing(values).commit();
  console.log(`[${dataset}] ${type}: setIfMissing applied to ${result._id}.`);
}

await seedSingleton("siteSettings", { contactEmail: CONTACT_EMAIL });
await seedSingleton("bookingPage", { formatNote: FORMAT_NOTE });
await seedSingleton("thankYouPage", THANK_YOU_DEFAULTS);

console.log(`[${dataset}] seed complete.`);
