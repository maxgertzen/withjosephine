import fs from "node:fs";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = sanityWriteClient({ dataset: "production" });

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
