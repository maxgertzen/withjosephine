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

type CleanupDoc = {
  _id: string;
  _type: "submission" | "giftRecord";
  email?: string;
  buyerFirstName?: string;
  _createdAt: string;
  isGift?: boolean;
};

const docs = await client.fetch<CleanupDoc[]>(
  `*[_type in ["submission", "giftRecord"]]{_id, _type, email, buyerFirstName, _createdAt, "isGift": coalesce(isGift, defined(gift))} | order(_createdAt desc)`,
);

function describeDoc(d: CleanupDoc): string {
  if (d._type === "giftRecord") return `GIFT RECORD from ${d.buyerFirstName || "(no name)"}`;
  return `${d.isGift ? "GIFT " : "READ "}${d.email ?? "(no email)"}`;
}

const submissionCount = docs.filter((d) => d._type === "submission").length;
const giftRecordCount = docs.length - submissionCount;

console.log(
  `Found ${submissionCount} submission docs and ${giftRecordCount} giftRecord docs in dataset "${dataset}"`,
);
for (const d of docs) {
  console.log(`  ${d._id}\t${describeDoc(d)}\t${d._createdAt}`);
}

if (docs.length === 0) {
  console.log("\nNothing to delete. Exiting.");
  process.exit(0);
}

if (!execute) {
  console.log(
    "\nDRY-RUN. Pass --execute to delete all submission and giftRecord docs from this dataset.",
  );
  process.exit(0);
}

const tx = client.transaction();
for (const d of docs) tx.delete(d._id);
await tx.commit({ visibility: "async" });
console.log(
  `\nDeleted ${submissionCount} submission docs and ${giftRecordCount} giftRecord docs from "${dataset}".`,
);
