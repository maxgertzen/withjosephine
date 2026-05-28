import type { PortableTextBlock } from "@portabletext/types";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const LOG_PREFIX = "migrate-magiclink-library-rename";

const ORPHAN_ID = "emailMagicLinkMyGifts";
const OLD_TARGET_ID = "emailMagicLinkMyReadings";
const NEW_TARGET_ID = "emailMagicLinkLibrary";

const OLD_SUBJECT = "Open your readings";
const OLD_PREVIEW = "A fresh link to your readings.";
const OLD_HERO_LINE = "Open your readings";
const OLD_BUTTON_LABEL = "Open my readings";
const OLD_BODY_FIRST_BLOCK_PLAINTEXT =
  "Here’s a fresh link to open your readings. It’ll sign you in for the next seven days, so you can come back to them without asking again.";

const NEW_SUBJECT = "Sign in to your library";
const NEW_PREVIEW = "A fresh sign-in link for your readings and gifts.";
const NEW_HERO_LINE = "Sign in to your library";
const NEW_BUTTON_LABEL = "Sign in";
const NEW_BODY: PortableTextBlock[] = [
  {
    _type: "block",
    _key: "library-body-1",
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "library-body-1-span",
        text:
          "Here’s a fresh sign-in link for your library. It’ll sign you in for the next seven days so you can come back to your readings (and any gifts you’ve shared) without asking again.",
        marks: [],
      },
    ],
  },
  {
    _type: "block",
    _key: "library-body-2",
    style: "normal",
    markDefs: [],
    children: [
      {
        _type: "span",
        _key: "library-body-2-span",
        text:
          "This link expires in twenty-four hours. If you didn’t ask for it, it’s safe to ignore. Nothing happens until someone clicks.",
        marks: [],
      },
    ],
  },
];

type SingletonDoc = {
  _id: string;
  _type?: string;
  subject?: string;
  preview?: string;
  heroLine?: string;
  buttonLabel?: string;
  greeting?: string;
  body?: PortableTextBlock[];
  signOff?: string | null;
};

function firstBlockPlaintext(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0] as PortableTextBlock | undefined;
  if (!first || first._type !== "block") return null;
  const children = (first.children ?? []) as Array<{ _type?: string; text?: string }>;
  return children
    .filter((child) => child._type === "span" && typeof child.text === "string")
    .map((child) => child.text)
    .join("");
}

async function deleteSingletonAllVariants(
  client: ReturnType<typeof sanityWriteClient>,
  baseId: string,
): Promise<number> {
  const ids = [baseId, `drafts.${baseId}`];
  let count = 0;
  for (const id of ids) {
    try {
      const result = await client.delete(id);
      if (result) {
        count += 1;
        console.log(`[${LOG_PREFIX}] deleted ${id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/not\s+found|no\s+such\s+document/i.test(message)) {
        console.log(`[${LOG_PREFIX}] ${id} not present (no-op)`);
      } else {
        throw err;
      }
    }
  }
  return count;
}

async function main(): Promise<void> {
  const client = sanityWriteClient();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[${LOG_PREFIX}] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }

  // 1) Delete the orphan emailMagicLinkMyGifts document, drafted or published.
  const orphanDeleted = await deleteSingletonAllVariants(client, ORPHAN_ID);
  if (orphanDeleted === 0) {
    console.log(`[${LOG_PREFIX}] orphan ${ORPHAN_ID} not present on this dataset`);
  }

  // 2) Rename emailMagicLinkMyReadings → emailMagicLinkLibrary.
  const existingNew = await client.fetch<SingletonDoc | null>(
    `*[_id == $id][0]{_id}`,
    { id: NEW_TARGET_ID },
  );
  const existingOld = await client.fetch<SingletonDoc | null>(
    `*[_id == $id][0]{_id, subject, preview, heroLine, buttonLabel, greeting, body, signOff}`,
    { id: OLD_TARGET_ID },
  );

  if (existingNew) {
    console.log(`[${LOG_PREFIX}] ${NEW_TARGET_ID} already exists — skipping rename half.`);
    if (existingOld) {
      // The new doc already exists AND the old doc is still around → the old
      // is stale. Delete it so the desk doesn't show a ghost entry.
      console.log(
        `[${LOG_PREFIX}] stale ${OLD_TARGET_ID} present alongside ${NEW_TARGET_ID}; deleting stale copy.`,
      );
      await deleteSingletonAllVariants(client, OLD_TARGET_ID);
    }
  } else if (!existingOld) {
    console.log(`[${LOG_PREFIX}] neither ${OLD_TARGET_ID} nor ${NEW_TARGET_ID} present; nothing to rename.`);
  } else {
    // Copy old content into a new doc under the new _id/_type.
    const seed = {
      _id: NEW_TARGET_ID,
      _type: NEW_TARGET_ID,
      ...(existingOld.subject !== undefined ? { subject: existingOld.subject } : {}),
      ...(existingOld.preview !== undefined ? { preview: existingOld.preview } : {}),
      ...(existingOld.heroLine !== undefined ? { heroLine: existingOld.heroLine } : {}),
      ...(existingOld.buttonLabel !== undefined ? { buttonLabel: existingOld.buttonLabel } : {}),
      ...(existingOld.greeting !== undefined ? { greeting: existingOld.greeting } : {}),
      ...(existingOld.body !== undefined ? { body: existingOld.body } : {}),
      ...(existingOld.signOff !== undefined ? { signOff: existingOld.signOff } : {}),
    };
    await client.createIfNotExists(seed);
    console.log(`[${LOG_PREFIX}] created ${NEW_TARGET_ID} from ${OLD_TARGET_ID} content.`);
    await deleteSingletonAllVariants(client, OLD_TARGET_ID);
  }

  // 3) Update emailMagicLinkLibrary fields only where the value still
  //    matches the OLD default (so Becky edits are preserved).
  const target = await client.fetch<SingletonDoc | null>(
    `*[_id == $id][0]{_id, subject, preview, heroLine, buttonLabel, body}`,
    { id: NEW_TARGET_ID },
  );

  if (!target) {
    console.warn(`[${LOG_PREFIX}] no ${NEW_TARGET_ID} singleton in this dataset after rename step.`);
    return;
  }

  const updates: Record<string, unknown> = {};
  if (target.subject === OLD_SUBJECT) updates.subject = NEW_SUBJECT;
  if (target.preview === OLD_PREVIEW) updates.preview = NEW_PREVIEW;
  if (target.heroLine === OLD_HERO_LINE) updates.heroLine = NEW_HERO_LINE;
  if (target.buttonLabel === OLD_BUTTON_LABEL) updates.buttonLabel = NEW_BUTTON_LABEL;
  if (firstBlockPlaintext(target.body) === OLD_BODY_FIRST_BLOCK_PLAINTEXT) {
    updates.body = NEW_BODY;
  }

  if (Object.keys(updates).length === 0) {
    console.log(
      `[${LOG_PREFIX}] ${NEW_TARGET_ID}: every field already differs from old defaults (likely Becky-edited). No changes.`,
    );
    return;
  }

  await client.patch(target._id).set(updates).commit();
  console.log(
    `[${LOG_PREFIX}] ${NEW_TARGET_ID}: updated fields=${Object.keys(updates).join(",")}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
