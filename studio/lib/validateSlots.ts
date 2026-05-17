import {
  collectUnknownSlots,
  EMAIL_ALLOWED_SLOTS,
  type EmailTemplateKey,
  formatSlotError,
} from "../../src/lib/emails/slots";

type CustomValidator = (value: unknown) => true | string;
type RuleLike<R> = { custom: (fn: CustomValidator) => R };

export function slotValidation(template: EmailTemplateKey) {
  const allowed = EMAIL_ALLOWED_SLOTS[template];
  return <R extends RuleLike<R>>(rule: R): R =>
    rule.custom((value) => {
      const unknown = collectUnknownSlots(value, allowed);
      if (unknown.length === 0) return true;
      return formatSlotError(unknown, allowed);
    });
}
