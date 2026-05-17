import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "production";
const execute = process.argv.includes("--execute");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const docs = await client.fetch<
  Array<{ _id: string; email?: string; _createdAt: string; isGift?: boolean }>
>(
  `*[_type == "submission"]{_id, email, _createdAt, isGift} | order(_createdAt desc)`,
);

console.log(`Found ${docs.length} submission docs in dataset "${dataset}"`);
for (const d of docs) {
  console.log(
    `  ${d._id}\t${d.isGift ? "GIFT " : "READ "}${d.email ?? "(no email)"}\t${d._createdAt}`,
  );
}

if (docs.length === 0) {
  console.log("\nNothing to delete. Exiting.");
  process.exit(0);
}

if (!execute) {
  console.log(
    "\nDRY-RUN. Pass --execute to delete all submission docs from this dataset.",
  );
  process.exit(0);
}

const tx = client.transaction();
for (const d of docs) tx.delete(d._id);
await tx.commit({ visibility: "async" });
console.log(`\nDeleted ${docs.length} submission docs from "${dataset}".`);
