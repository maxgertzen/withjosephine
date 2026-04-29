import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

await client
  .patch("formSection-anythingElse")
  .set({
    sectionTitle: "Anything else for me?",
    transitionLine: null,
  })
  .commit();
console.log("Patched formSection-anythingElse: shorter title, removed transition line.");

await client
  .patch("formField-anythingElse")
  .set({
    label: "Your note",
  })
  .commit();
console.log("Patched formField-anythingElse: label → 'Your note'.");

console.log("\nDone.");
