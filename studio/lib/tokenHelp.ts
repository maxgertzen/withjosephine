import { defineField } from "sanity";

import { EMAIL_ALLOWED_SLOTS, type EmailTemplateKey } from "../../src/lib/emails/slots";

function tokenList(template: EmailTemplateKey): string {
  const tokens = EMAIL_ALLOWED_SLOTS[template];
  if (tokens.length === 0) return "(this email has no tokens)";
  return tokens.map((slot) => `{${slot}}`).join(", ");
}

export function tokenHelp(template: EmailTemplateKey, purpose: string): string {
  const tokens = EMAIL_ALLOWED_SLOTS[template];
  if (tokens.length === 0) return purpose;
  return `${purpose}\n\nAvailable tokens (use anywhere in any text field): ${tokenList(template)}`;
}

/**
 * A read-only header field that renders the per-template token catalog as
 * help text at the top of the document edit pane. `defineType.description`
 * is not visible from inside the open document in Sanity Studio v5 — this
 * synthetic field is the workaround.
 */
export function tokenReferenceField(template: EmailTemplateKey) {
  return defineField({
    name: "tokenReference",
    title: "Tokens you can use",
    type: "string",
    readOnly: true,
    description: `Type any of these in any text field (subject, greeting, body, etc.) and it auto-substitutes when the email sends.\n\n${tokenList(template)}`,
  });
}
