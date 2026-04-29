import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

type Doc = {
  _id: string;
  _type: string;
  appliesToServices?: unknown[];
};

const types = ["formSection", "formField"];

for (const type of types) {
  const docs = await client.fetch<Doc[]>(
    `*[_type==$type && defined(appliesToServices) && count(appliesToServices) > 0]{_id, _type, appliesToServices}`,
    { type },
  );

  for (const doc of docs) {
    const items = doc.appliesToServices ?? [];
    const needsFix = items.every((item) => typeof item === "string");
    if (!needsFix) {
      console.log(`SKIP ${doc._id} (already proper refs)`);
      continue;
    }
    const refs = (items as string[]).map((id) => ({
      _key: id,
      _type: "reference" as const,
      _ref: id,
    }));
    await client.patch(doc._id).set({ appliesToServices: refs }).commit();
    console.log(`PATCH ${doc._id} → ${refs.length} refs`);
  }
}

console.log("\nDone.");
