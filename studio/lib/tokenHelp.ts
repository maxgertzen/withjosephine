import { defineField } from "sanity";

import { tokenCatalogBanner } from "../components/TokenCatalogBanner";
import { type EmailTemplateKey } from "../../src/lib/emails/slots";

// Sanity v5 doesn't render defineType.description inside the open document,
// and a plain readOnly string field still draws an empty input. components.field
// replaces the entire field shell so Becky sees a clean catalog.
export function tokenReferenceField(
  source: EmailTemplateKey | { tokens: readonly string[] },
) {
  return defineField({
    name: "tokenReference",
    title: "Tokens you can use",
    type: "string",
    readOnly: true,
    components: {
      field: tokenCatalogBanner(typeof source === "string" ? source : source.tokens),
    },
  });
}
