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
});

const data = await client.fetch(`
  *[_type == "bookingForm"][0] {
    "page1": sections[]-> {
      _id, sectionTitle, pageBoundary, order,
      "fields": fields[]-> {
        _id, key, label, type, required, system, validation,
        "appliesToServices": appliesToServices[]->slug.current
      }
    } | order(order asc)
  }
`);

const sections = data?.page1 ?? [];
let pageIdx = 0;
for (const section of sections) {
  if (section.pageBoundary === true && pageIdx > 0) pageIdx++;
  if (pageIdx === 0) {
    console.log(`\nSection: ${section._id}  page: ${pageIdx + 1}`);
    for (const f of section.fields ?? []) {
      console.log(
        `  field: ${f.key.padEnd(20)}  type=${(f.type ?? "?").padEnd(10)}  required=${f.required}  validation=${JSON.stringify(f.validation)}`,
      );
    }
  }
  if (section.pageBoundary === true) pageIdx++;
}
