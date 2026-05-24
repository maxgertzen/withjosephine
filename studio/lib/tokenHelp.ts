import { EMAIL_ALLOWED_SLOTS, type EmailTemplateKey } from "../../src/lib/emails/slots";

export function tokenHelp(template: EmailTemplateKey, purpose: string): string {
  const tokens = EMAIL_ALLOWED_SLOTS[template];
  if (tokens.length === 0) return purpose;
  const list = tokens.map((slot) => `{${slot}}`).join(", ");
  return `${purpose}\n\nAvailable tokens (use anywhere in any text field): ${list}`;
}
