"use client";

import { useMemo } from "react";

import type { FieldValues } from "@/components/IntakeForm/types";
import { buildPageSchema } from "@/lib/booking/buildPageSchema";
import { buildNameFollowupSchema } from "@/lib/booking/nameFollowupSchema";
import type { SanityFormField } from "@/lib/sanity/types";

import { collectFieldErrors } from "./intakeValidation";

export type UsePageErrorsArgs = {
  allFields: SanityFormField[];
  currentKeys: string[];
  values: FieldValues;
};

export type UsePageErrorsResult = {
  pageErrors: Record<string, string>;
  firstErrorKey: string | null;
  firstFieldLabel: string | null;
  errorCount: number;
};

export function usePageErrors({
  allFields,
  currentKeys,
  values,
}: UsePageErrorsArgs): UsePageErrorsResult {
  // Stable across keystrokes — the page's structural schema only changes
  // when the active page changes or the CMS form definition changes.
  const pageSchema = useMemo(
    () => buildPageSchema(allFields, currentKeys),
    [allFields, currentKeys],
  );
  const currentFields = useMemo(
    () => allFields.filter((field) => currentKeys.includes(field.key)),
    [allFields, currentKeys],
  );

  return useMemo(() => {
    const followupSchema = buildNameFollowupSchema(currentFields, values);
    const pageResult = pageSchema.safeParse(values);
    const followupResult = followupSchema.safeParse(values);
    const issues = [
      ...(pageResult.success ? [] : pageResult.error.issues),
      ...(followupResult.success ? [] : followupResult.error.issues),
    ];
    const fieldErrors = collectFieldErrors(issues);
    const firstErrorKey =
      currentKeys.find((key) => fieldErrors[key] !== undefined) ?? null;
    const firstFieldLabel = firstErrorKey
      ? (allFields.find((field) => field.key === firstErrorKey)?.label ?? firstErrorKey)
      : null;
    return {
      pageErrors: fieldErrors,
      firstErrorKey,
      firstFieldLabel,
      errorCount: Object.keys(fieldErrors).length,
    };
  }, [pageSchema, currentFields, allFields, currentKeys, values]);
}
