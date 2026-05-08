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

const CANONICAL_PAYMENT_BUTTON_TEXT = "Continue to payment →";

const bookingPageId = await client.fetch<string | null>(`*[_type == "bookingPage"][0]._id`);
if (bookingPageId) {
  // Force-set paymentButtonText to the canonical sentence-case + arrow form. The
  // existing dataset value was the pre-PR-#85 schema default ("Continue to Payment"),
  // which setIfMissing wouldn't overwrite — but nothing customized it manually,
  // so set() is safe and matches the new schema initialValue.
  const existing = await client.fetch<{ paymentButtonText?: string }>(
    `*[_id == $id][0]{paymentButtonText}`,
    { id: bookingPageId },
  );
  if (existing.paymentButtonText !== CANONICAL_PAYMENT_BUTTON_TEXT) {
    await client.patch(bookingPageId).set({ paymentButtonText: CANONICAL_PAYMENT_BUTTON_TEXT }).commit();
    console.log(
      `[${dataset}] bookingPage.paymentButtonText updated ${JSON.stringify(existing.paymentButtonText)} → ${JSON.stringify(CANONICAL_PAYMENT_BUTTON_TEXT)} on ${bookingPageId}.`,
    );
  } else {
    console.log(`[${dataset}] bookingPage.paymentButtonText already canonical on ${bookingPageId}.`);
  }
} else {
  console.log(`[${dataset}] No bookingPage doc found — schema initialValue will seed on first edit.`);
}

const bookingFormId = await client.fetch<string | null>(`*[_type == "bookingForm"][0]._id`);
if (bookingFormId) {
  await client
    .patch(bookingFormId)
    .setIfMissing({
      nextButtonText: "Next →",
      saveAndContinueLaterText: "Save and continue later",
      loadingStateCopy: "One moment — taking you to checkout.",
    })
    .commit();
  console.log(
    `[${dataset}] bookingForm intake nav copy seeded if missing on ${bookingFormId} (pageIndicatorTagline left blank by design).`,
  );
} else {
  console.log(`[${dataset}] No bookingForm doc found — schema initialValue will seed on first edit.`);
}

const landingPageId = await client.fetch<string | null>(`*[_type == "landingPage"][0]._id`);
if (landingPageId) {
  await client
    .patch(landingPageId)
    .setIfMissing({
      "contactSection.successHeading": "message sent",
      "contactSection.successBody":
        "Thank you for reaching out. I’ll get back to you as soon as I can.",
      "contactSection.sendAnotherButtonText": "Send another message",
    })
    .commit();
  console.log(
    `[${dataset}] landingPage.contactSection success-state copy seeded if missing on ${landingPageId}.`,
  );
} else {
  console.log(`[${dataset}] No landingPage doc found — schema initialValue will seed on first edit.`);
}

console.log(`[${dataset}] Done.`);
