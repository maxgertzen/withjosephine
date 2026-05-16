"use client";

import { useMemo } from "react";

import type { FieldValues } from "@/components/IntakeForm/types";
import type { SanityFormField } from "@/lib/sanity/types";

import { validateCurrentPage } from "./intakeValidation";

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
  return useMemo(() => {
    const { fieldErrors } = validateCurrentPage(allFields, currentKeys, values);
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
  }, [allFields, currentKeys, values]);
}
