import fs from "node:fs";

import { stringToPortableTextBlocks } from "../src/lib/emails/portableTextBuild";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const datasetArg = process.argv[2];
if (!datasetArg) {
  console.error(
    "Usage: pnpm exec tsx scripts/migrate-email-body-consolidate-2026-05-25.mts <staging|production>",
  );
  process.exit(1);
}

const client = sanityWriteClient({ dataset: datasetArg });

type DocLike = Record<string, unknown> & { _id?: string };
type PortableTextBlock = ReturnType<typeof stringToPortableTextBlocks>[number];

const stringBlock = (text: string): PortableTextBlock => stringToPortableTextBlocks(text)[0];

function isPortableTextArray(value: unknown): value is PortableTextBlock[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry && typeof entry === "object" && (entry as { _type?: string })._type === "block",
    )
  );
}

function toBlocks(value: unknown): PortableTextBlock[] {
  if (value == null) return [];
  if (typeof value === "string") {
    return value.trim().length === 0 ? [] : [stringBlock(value)];
  }
  if (isPortableTextArray(value)) return value;
  return [];
}

function bodyNonEmpty(doc: DocLike, field: string): boolean {
  const value = doc[field];
  return isPortableTextArray(value) && value.length > 0;
}

type FoldResult = { patches: Record<string, unknown>; reason?: string };

function foldFlatBody(
  doc: DocLike,
  source: { greeting: string; pt: string[] },
): FoldResult {
  if (bodyNonEmpty(doc, "body")) return { patches: {}, reason: "body already populated" };
  const blocks: PortableTextBlock[] = [];
  const greeting = doc[source.greeting];
  if (typeof greeting === "string" && greeting.trim().length > 0) {
    blocks.push(stringBlock(greeting));
  }
  for (const field of source.pt) {
    blocks.push(...toBlocks(doc[field]));
  }
  if (blocks.length === 0) return { patches: {}, reason: "no source content to fold" };
  return { patches: { body: blocks } };
}

function foldButtonSplitBody(
  doc: DocLike,
  intro: { greeting?: string; pt: string[] },
  post: { pt: string[] },
): FoldResult {
  const patches: Record<string, unknown> = {};
  if (!bodyNonEmpty(doc, "bodyIntro")) {
    const blocks: PortableTextBlock[] = [];
    if (intro.greeting) {
      const greeting = doc[intro.greeting];
      if (typeof greeting === "string" && greeting.trim().length > 0) {
        blocks.push(stringBlock(greeting));
      }
    }
    for (const field of intro.pt) {
      const value = doc[field];
      if (typeof value === "string" && value.trim().length > 0) {
        blocks.push(stringBlock(value));
      } else {
        blocks.push(...toBlocks(value));
      }
    }
    if (blocks.length > 0) patches.bodyIntro = blocks;
  }
  if (!bodyNonEmpty(doc, "bodyPostButton")) {
    const blocks: PortableTextBlock[] = [];
    for (const field of post.pt) {
      blocks.push(...toBlocks(doc[field]));
    }
    if (blocks.length > 0) patches.bodyPostButton = blocks;
  }
  return { patches };
}

function foldMagicLink(doc: DocLike): FoldResult {
  const body = doc["body"];
  const greeting = doc["greeting"];
  if (typeof greeting !== "string" || greeting.trim().length === 0) {
    return { patches: {}, reason: "no greeting to fold" };
  }
  if (Array.isArray(body) && isPortableTextArray(body)) {
    const firstText = (body[0]?.children?.[0] as { text?: string } | undefined)?.text ?? "";
    if (firstText.trim() === greeting.trim()) {
      return { patches: {}, reason: "greeting already at body[0]" };
    }
    return { patches: { body: [stringBlock(greeting), ...body], greeting: null } };
  }
  if (Array.isArray(body) && body.every((entry) => typeof entry === "string")) {
    const blocks = [stringBlock(greeting), ...(body as string[]).map(stringBlock)];
    return { patches: { body: blocks, greeting: null } };
  }
  return { patches: {}, reason: "body shape unexpected" };
}

const SUMMARY = {
  mutated: [] as string[],
  noop: [] as string[],
  failed: [] as Array<{ id: string; reason: string }>,
  cloned: [] as string[],
};

async function applyPatch(docId: string, patches: Record<string, unknown>, label: string) {
  if (Object.keys(patches).length === 0) {
    SUMMARY.noop.push(`${docId} (${label})`);
    return;
  }
  await client.patch(docId).set(patches).commit();
  SUMMARY.mutated.push(`${docId} (${label}: ${Object.keys(patches).join(", ")})`);
}

async function migrateOrderConfirmation() {
  const doc = (await client.getDocument("emailOrderConfirmation")) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: "emailOrderConfirmation", reason: "doc does not exist" });
    return;
  }
  const fold = foldFlatBody(doc, {
    greeting: "greeting",
    pt: ["thanksLine", "timelineLine", "contactLine"],
  });
  if (fold.reason) SUMMARY.noop.push(`emailOrderConfirmation (${fold.reason})`);
  await applyPatch("emailOrderConfirmation", fold.patches, "fold body");
}

async function migrateRecipientIntakeReceived() {
  const doc = (await client.getDocument("emailRecipientIntakeReceived")) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: "emailRecipientIntakeReceived", reason: "doc does not exist" });
    return;
  }
  const fold = foldFlatBody(doc, {
    greeting: "greeting",
    pt: ["thanksLine", "timelineLine", "contactLine"],
  });
  if (fold.reason) SUMMARY.noop.push(`emailRecipientIntakeReceived (${fold.reason})`);
  await applyPatch("emailRecipientIntakeReceived", fold.patches, "fold body");
}

async function migrateDay7Delivery() {
  const doc = (await client.getDocument("emailDay7Delivery")) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: "emailDay7Delivery", reason: "doc does not exist" });
    return;
  }
  const fold = foldButtonSplitBody(
    doc,
    { greeting: "greeting", pt: ["lineReady", "comfortLine"] },
    { pt: ["signedInDisclosure", "accessWindowLine", "comfortFollowUp"] },
  );
  await applyPatch("emailDay7Delivery", fold.patches, "fold body intro+post");
}

async function migratePrivacyExport() {
  const doc = (await client.getDocument("emailPrivacyExport")) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: "emailPrivacyExport", reason: "doc does not exist" });
    return;
  }
  const fold = foldButtonSplitBody(
    doc,
    { greeting: "greeting", pt: ["introLine", "contentsLine"] },
    { pt: ["expiryLine"] },
  );
  await applyPatch("emailPrivacyExport", fold.patches, "fold body intro+post");
}

async function migrateMagicLink(docId: string) {
  const doc = (await client.getDocument(docId)) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: docId, reason: "doc does not exist" });
    return;
  }
  const fold = foldMagicLink(doc);
  if (fold.reason) SUMMARY.noop.push(`${docId} (${fold.reason})`);
  await applyPatch(docId, fold.patches, "fold greeting into body");
}

async function migrateGiftClaimSplit() {
  const doc = (await client.getDocument("emailGiftClaim")) as DocLike | null;
  if (!doc) {
    SUMMARY.failed.push({ id: "emailGiftClaim", reason: "doc does not exist" });
    return;
  }
  // Fold first-send fields into body on the existing doc.
  if (!bodyNonEmpty(doc, "body")) {
    const blocks: PortableTextBlock[] = [];
    const greeting = doc["greeting"];
    if (typeof greeting === "string" && greeting.trim().length > 0) {
      blocks.push(stringBlock(greeting));
    }
    blocks.push(...toBlocks(doc["bodyFirstSend"]));
    if (blocks.length > 0) {
      await applyPatch("emailGiftClaim", { body: blocks }, "fold first-send body");
    } else {
      SUMMARY.noop.push("emailGiftClaim (no first-send content to fold)");
    }
  } else {
    SUMMARY.noop.push("emailGiftClaim (body already populated)");
  }

  // Clone reminder fields into a new emailGiftClaimReminder doc if absent.
  const reminderId = "emailGiftClaimReminder";
  const existing = await client.getDocument(reminderId);
  if (existing) {
    SUMMARY.noop.push(`${reminderId} (already exists)`);
    return;
  }
  const reminderBody: PortableTextBlock[] = [];
  const greeting = doc["greeting"];
  if (typeof greeting === "string" && greeting.trim().length > 0) {
    reminderBody.push(stringBlock(greeting));
  }
  reminderBody.push(...toBlocks(doc["bodyReminder"]));
  reminderBody.push(...toBlocks(doc["reminderContactLine"]));

  const reminderDoc: Record<string, unknown> = {
    _id: reminderId,
    _type: "emailGiftClaimReminder",
    subject: doc["subjectReminder"] ?? "A reading is still waiting for you",
    preview:
      doc["previewReminder"] ?? "A small reminder about the reading {purchaserFirstName} sent you.",
    brandName: doc["brandName"] ?? "Josephine",
    brandSubtitle: doc["brandSubtitle"] ?? "Soul Readings",
    heroLine: doc["heroLineReminder"] ?? "Still here, when you’re ready",
    giftMessageLabel: doc["giftMessageLabel"] ?? "A note from {purchaserFirstName}",
    cardLabel: doc["cardLabel"] ?? "The gift",
    cardDeliveryLine: doc["cardDeliveryLine"] ?? "Delivered within 7 days of your intake",
    signOffLine1: doc["signOffLine1"] ?? "With love,",
    signOffLine2: doc["signOffLine2"] ?? "Josephine ✦",
    footerDisclaimer:
      doc["footerDisclaimer"] ?? "Readings are offered for entertainment and personal reflection.",
  };
  if (reminderBody.length > 0) reminderDoc.body = reminderBody;

  await client.createIfNotExists(reminderDoc as never);
  SUMMARY.cloned.push(`${reminderId} created from emailGiftClaim`);
}

async function migrateGiftPurchaseSplit() {
  const oldId = "emailGiftPurchaseConfirmation";
  const old = (await client.getDocument(oldId)) as DocLike | null;
  if (!old) {
    SUMMARY.failed.push({ id: oldId, reason: "legacy doc does not exist; nothing to clone" });
    return;
  }

  const selfSendId = "emailGiftPurchaseConfirmationSelfSend";
  const scheduledId = "emailGiftPurchaseConfirmationScheduled";

  const existingSelfSend = await client.getDocument(selfSendId);
  if (existingSelfSend) {
    SUMMARY.noop.push(`${selfSendId} (already exists)`);
  } else {
    const blocks: PortableTextBlock[] = [];
    const greeting = old["greeting"];
    if (typeof greeting === "string" && greeting.trim().length > 0) {
      blocks.push(stringBlock(greeting));
    }
    blocks.push(...toBlocks(old["detailLineSelfSend"]));

    const doc: Record<string, unknown> = {
      _id: selfSendId,
      _type: "emailGiftPurchaseConfirmationSelfSend",
      subject: old["subjectSelfSend"] ?? "Your gift is ready to share",
      preview: old["previewSelfSend"] ?? "Your shareable link is inside.",
      brandName: old["brandName"] ?? "Josephine",
      brandSubtitle: old["brandSubtitle"] ?? "Soul Readings",
      heroLine: old["heroLineSelfSend"] ?? "A reading, ready for them",
      shareButtonLabel: old["shareButtonLabel"] ?? "OPEN GIFT LINK",
      shareUrlHelper: toBlocks(old["shareUrlHelper"]),
      cardLabel: old["cardLabel"] ?? "The gift",
      cardDeliveryLine: old["cardDeliveryLine"] ?? "Delivery within 7 days of claim",
      refundLine: toBlocks(old["refundLine"]),
      signOffLine1: old["signOffLine1"] ?? "With love,",
      signOffLine2: old["signOffLine2"] ?? "Josephine ✦",
      footerDisclaimer:
        old["footerDisclaimer"] ??
        "Readings are offered for entertainment and personal reflection.",
    };
    if (blocks.length > 0) doc.body = blocks;
    await client.createIfNotExists(doc as never);
    SUMMARY.cloned.push(`${selfSendId} created from ${oldId}`);
  }

  const existingScheduled = await client.getDocument(scheduledId);
  if (existingScheduled) {
    SUMMARY.noop.push(`${scheduledId} (already exists)`);
  } else {
    const blocks: PortableTextBlock[] = [];
    const greeting = old["greeting"];
    if (typeof greeting === "string" && greeting.trim().length > 0) {
      blocks.push(stringBlock(greeting));
    }
    blocks.push(...toBlocks(old["detailLineScheduled"]));

    const doc: Record<string, unknown> = {
      _id: scheduledId,
      _type: "emailGiftPurchaseConfirmationScheduled",
      subject: old["subjectScheduled"] ?? "Your gift is scheduled",
      preview: old["previewScheduled"] ?? "We'll send it to {recipientName} on {sendAtDisplay}.",
      brandName: old["brandName"] ?? "Josephine",
      brandSubtitle: old["brandSubtitle"] ?? "Soul Readings",
      heroLine: old["heroLineScheduled"] ?? "A reading, on its way",
      cardLabel: old["cardLabel"] ?? "The gift",
      cardDeliveryLine: old["cardDeliveryLine"] ?? "Delivery within 7 days of claim",
      refundLine: toBlocks(old["refundLine"]),
      signOffLine1: old["signOffLine1"] ?? "With love,",
      signOffLine2: old["signOffLine2"] ?? "Josephine ✦",
      footerDisclaimer:
        old["footerDisclaimer"] ??
        "Readings are offered for entertainment and personal reflection.",
    };
    if (blocks.length > 0) doc.body = blocks;
    await client.createIfNotExists(doc as never);
    SUMMARY.cloned.push(`${scheduledId} created from ${oldId}`);
  }
}

await migrateOrderConfirmation();
await migrateRecipientIntakeReceived();
await migrateDay7Delivery();
await migratePrivacyExport();
await migrateMagicLink("emailMagicLink");
await migrateMagicLink("emailMagicLinkLibrary");
await migrateGiftClaimSplit();
await migrateGiftPurchaseSplit();

console.log(`\nDone against dataset "${datasetArg}".`);
console.log(`Mutated: ${SUMMARY.mutated.length}`);
for (const entry of SUMMARY.mutated) console.log(`  + ${entry}`);
console.log(`Cloned: ${SUMMARY.cloned.length}`);
for (const entry of SUMMARY.cloned) console.log(`  * ${entry}`);
console.log(`No-op: ${SUMMARY.noop.length}`);
for (const entry of SUMMARY.noop) console.log(`  - ${entry}`);
console.log(`Failed: ${SUMMARY.failed.length}`);
for (const entry of SUMMARY.failed) console.log(`  ! ${entry.id}: ${entry.reason}`);
if (SUMMARY.failed.length > 0) process.exit(2);
