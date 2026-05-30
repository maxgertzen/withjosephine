#!/usr/bin/env tsx

import { fileURLToPath } from "node:url";

import { stringToPortableTextBlocks } from "../src/lib/emails/portableTextBuild";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-day7-copy-rewrite";

const OLD_DAY7_BODY_INTRO_PLAINTEXT = [
  "Hi {firstName},",
  "Your {readingName} is here.",
  "Open it whenever the timing feels right — it’s saved to you, not to a deadline. Headphones if you have them, somewhere quiet if you can.",
].join("\n\n");

const OLD_DAY7_BODY_POST_BUTTON_PLAINTEXT = [
  "One small thing: opening this from the link above signs you into your reading for the next seven days, so you can come back to the voice note and the PDF without asking again. After that, just tell us your email and we’ll send you back in.",
  "Your link is good for the next ninety days. After that, just email me and I’ll send you a fresh one.",
  "If anything you hear sits hard, or a question opens up after, write to me. I’d rather know than not.",
].join("\n\n");

const NEW_BODY_INTRO = [
  ...stringToPortableTextBlocks("Hi {firstName},"),
  ...stringToPortableTextBlocks("Your {readingName} is here."),
  ...stringToPortableTextBlocks(
    "Open it whenever the timing feels right. It is saved to you, not to a deadline. Headphones if you have them, somewhere quiet if you can.",
  ),
];

const NEW_BODY_POST_BUTTON = [
  ...stringToPortableTextBlocks(
    "Tap below to open your reading. You will be signed in for the next seven days, so you can come back to the voice note and the PDF without asking again.",
  ),
  ...stringToPortableTextBlocks(
    "This link is just for you; please do not share it.",
  ),
  ...stringToPortableTextBlocks(
    "Your reading stays here for the next ninety days. If a link expires sooner, just email me and I will send you a fresh one.",
  ),
  ...stringToPortableTextBlocks(
    "If anything you hear sits hard, or a question opens up after, write to me. I would rather know than not.",
  ),
];

const LEGACY_FIELDS = [
  "greeting",
  "lineReady",
  "comfortLine",
  "signedInDisclosure",
  "accessWindowLine",
  "comfortFollowUp",
] as const;

const OLD_ORDER_CONFIRMATION_SUBJECT =
  "Your reading is booked — here’s what happens next";
const NEW_ORDER_CONFIRMATION_SUBJECT =
  "Your reading is booked: what happens next";

const OLD_ORDER_CONFIRMATION_PREVIEW =
  "Your reading is booked — here’s what happens next";
const NEW_ORDER_CONFIRMATION_PREVIEW =
  "Your reading is booked: what happens next";

type PortableTextBlock = {
  _type: "block";
  _key?: string;
  children?: Array<{ _type: "span"; text?: string }>;
};

function ptToPlainText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return (value as PortableTextBlock[])
    .filter((block) => block?._type === "block")
    .map((block) =>
      (block.children ?? [])
        .filter((c) => c._type === "span")
        .map((c) => c.text ?? "")
        .join(""),
    )
    .join("\n\n");
}

async function main(): Promise<void> {
  loadDotenv();

  const dataset = process.argv[2];
  if (dataset !== "staging" && dataset !== "production") {
    console.error(
      `Usage: pnpm tsx scripts/migrate-day7-copy-rewrite-2026-05-28.ts staging|production`,
    );
    process.exit(2);
  }

  const client = sanityWriteClient({ dataset });
  console.log(`[${LOG_PREFIX}] dataset=${dataset}`);

  const day7 = await client.fetch<
    | {
        _id: string;
        bodyIntro?: unknown;
        bodyPostButton?: unknown;
      }
    | null
  >(`*[_type == "emailDay7Delivery"][0]{_id, bodyIntro, bodyPostButton}`);

  if (!day7) {
    console.warn(`[${LOG_PREFIX}] no emailDay7Delivery singleton in dataset=${dataset}`);
  } else {
    const patches: Record<string, unknown> = {};
    if (ptToPlainText(day7.bodyIntro) === OLD_DAY7_BODY_INTRO_PLAINTEXT) {
      patches.bodyIntro = NEW_BODY_INTRO;
    }
    if (ptToPlainText(day7.bodyPostButton) === OLD_DAY7_BODY_POST_BUTTON_PLAINTEXT) {
      patches.bodyPostButton = NEW_BODY_POST_BUTTON;
    }

    let txn = client.patch(day7._id).unset([...LEGACY_FIELDS]);
    if (Object.keys(patches).length > 0) txn = txn.set(patches);
    await txn.commit();
    console.log(
      `[${LOG_PREFIX}] emailDay7Delivery: unset=${LEGACY_FIELDS.join(",")}` +
        (Object.keys(patches).length > 0
          ? `, patched=${Object.keys(patches).join(",")}`
          : `, no body fields matched pre-rewrite text`),
    );
  }

  await applySubjectPatch(client, "emailOrderConfirmation", {
    subject: { from: OLD_ORDER_CONFIRMATION_SUBJECT, to: NEW_ORDER_CONFIRMATION_SUBJECT },
    preview: { from: OLD_ORDER_CONFIRMATION_PREVIEW, to: NEW_ORDER_CONFIRMATION_PREVIEW },
  });

  console.log(`[${LOG_PREFIX}] complete`);
}

async function applySubjectPatch(
  client: ReturnType<typeof sanityWriteClient>,
  type: string,
  fields: Record<string, { from: string; to: string }>,
): Promise<void> {
  const doc = await client.fetch<{ _id: string } & Record<string, unknown>>(
    `*[_type == $type][0]{_id, ${Object.keys(fields).join(", ")}}`,
    { type },
  );
  if (!doc) {
    console.warn(`[${LOG_PREFIX}] ${type}: no singleton in dataset, skipping`);
    return;
  }
  const patches: Record<string, string> = {};
  for (const [field, { from, to }] of Object.entries(fields)) {
    if (doc[field] === from) patches[field] = to;
  }
  if (Object.keys(patches).length === 0) {
    console.log(`[${LOG_PREFIX}] ${type}: no fields matched pre-rewrite text, skipping`);
    return;
  }
  await client.patch(doc._id).set(patches).commit();
  console.log(`[${LOG_PREFIX}] ${type}: patched fields=${Object.keys(patches).join(",")}`);
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
