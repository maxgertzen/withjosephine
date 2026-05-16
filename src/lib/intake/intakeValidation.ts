import type { FieldValues } from "@/components/IntakeForm/types";
import { buildPageSchema } from "@/lib/booking/buildPageSchema";
import { buildNameFollowupSchema } from "@/lib/booking/nameFollowupSchema";
import type { DynamicSchema } from "@/lib/booking/submissionSchema";
import type { SanityFormField } from "@/lib/sanity/types";

export const FIELD_ID_PREFIX = "field-";

export function fieldDomId(fieldKey: string): string {
  return `${FIELD_ID_PREFIX}${fieldKey}`;
}

export const INTAKE_SUBMIT_ERROR = {
  turnstileFailed: "turnstile_failed",
  validationFailed: "validation_failed",
  missingRedeemId: "missing_redeem_id",
  missingPaymentUrl: "missing_payment_url",
  networkError: "network_error",
} as const;

export type IntakeSubmitErrorCode =
  | (typeof INTAKE_SUBMIT_ERROR)[keyof typeof INTAKE_SUBMIT_ERROR]
  | `http_${number}`;

type FocusFirstErrorOptions = { scroll?: boolean };

export function focusFirstError(
  formEl: HTMLFormElement | null,
  fieldErrors: Record<string, string> | string,
  options: FocusFirstErrorOptions = {},
): void {
  const firstKey =
    typeof fieldErrors === "string" ? fieldErrors : Object.keys(fieldErrors)[0];
  if (!firstKey || !formEl) return;
  const el = formEl.querySelector<HTMLElement>(
    `#${fieldDomId(CSS.escape(firstKey))}`,
  );
  if (!el) return;
  if (options.scroll) el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus();
}

export function collectFieldErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export type IntakeValidationResult = {
  success: boolean;
  fieldErrors: Record<string, string>;
  parsedValues: FieldValues;
};

export function validateCurrentPage(
  allFields: SanityFormField[],
  currentKeys: string[],
  values: FieldValues,
): IntakeValidationResult {
  const pageSchema = buildPageSchema(allFields, currentKeys);
  const followupSchema = buildNameFollowupSchema(
    allFields.filter((field) => currentKeys.includes(field.key)),
    values,
  );
  const pageResult = pageSchema.safeParse(values);
  const followupResult = followupSchema.safeParse(values);
  const success = pageResult.success && followupResult.success;
  const issues = [
    ...(pageResult.success ? [] : pageResult.error.issues),
    ...(followupResult.success ? [] : followupResult.error.issues),
  ];
  return {
    success,
    fieldErrors: collectFieldErrors(issues),
    parsedValues: { ...(pageResult.success ? pageResult.data : {}), ...(followupResult.success ? followupResult.data : {}) } as FieldValues,
  };
}

export function validateFullSubmission(
  submissionSchema: DynamicSchema,
  allFields: SanityFormField[],
  values: FieldValues,
): IntakeValidationResult {
  const followupSchema = buildNameFollowupSchema(allFields, values);
  const result = submissionSchema.safeParse(values);
  const followupResult = followupSchema.safeParse(values);
  const success = result.success && followupResult.success;
  const issues = [
    ...(result.success ? [] : result.error.issues),
    ...(followupResult.success ? [] : followupResult.error.issues),
  ];
  return {
    success,
    fieldErrors: collectFieldErrors(issues),
    parsedValues: { ...(result.success ? result.data : {}), ...(followupResult.success ? followupResult.data : {}) } as FieldValues,
  };
}
