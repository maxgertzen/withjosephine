import { defineField } from "sanity";

import { tokenCatalogBanner } from "../components/TokenCatalogBanner";
import { EMAIL_ALLOWED_SLOTS, type EmailTemplateKey } from "../../src/lib/emails/slots";

export function tokenHelp(template: EmailTemplateKey, purpose: string): string {
  const tokens = EMAIL_ALLOWED_SLOTS[template];
  if (tokens.length === 0) return purpose;
  const list = tokens.map((slot) => `{${slot}}`).join(", ");
  return `${purpose}\n\nAvailable tokens (use anywhere in any text field): ${list}`;
}

/**
 * Synthetic field that renders the per-template token catalog as a banner
 * (no editable input) at the top of the email document edit pane.
 *
 * `defineType.description` is not visible inside the open document in Sanity
 * Studio v5 — and a plain read-only string field still renders an empty input
 * below the description. The `components.field` override here replaces the
 * entire field shell with a styled callout so Becky sees the catalog cleanly.
 *
 * The underlying field has no value (the field type is `string` but no one
 * sets it). Synced from EMAIL_ALLOWED_SLOTS so the catalog auto-updates when
 * we widen an allowlist.
 */
export function tokenReferenceField(template: EmailTemplateKey) {
  return defineField({
    name: "tokenReference",
    title: "Tokens you can use",
    type: "string",
    readOnly: true,
    components: {
      field: tokenCatalogBanner(template),
    },
  });
}
