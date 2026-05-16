import { useMemo } from "react";

import type { FieldValue, FieldValues } from "@/components/IntakeForm/types";
import { COMPANION_SUFFIX_UNKNOWN } from "@/lib/booking/constants";
import { derivePages, type IntakePage } from "@/lib/booking/derivePages";
import {
  buildSubmissionSchema,
  type DynamicSchema,
} from "@/lib/booking/submissionSchema";
import type {
  SanityFormField,
  SanityFormSection,
  SanityPagination,
} from "@/lib/sanity/types";

export type UseIntakeSchemaArgs = {
  sections: SanityFormSection[];
  readingId: string;
  pagination?: SanityPagination;
};

export type UseIntakeSchemaResult = {
  allFields: SanityFormField[];
  pages: IntakePage[];
  totalPages: number;
  submissionSchema: DynamicSchema;
  timeUnknownPairs: Map<string, string>;
  timeUnknownLabels: Map<string, string>;
  pairedUnknownKeys: Set<string>;
  defaultValues: FieldValues;
  defaultValuesSnapshot: string;
};

export function initialValueFor(field: SanityFormField): FieldValue {
  if (field.type === "multiSelectExact") return [];
  if (field.type === "consent") return false;
  return "";
}

export function flattenFields(sections: SanityFormSection[]): SanityFormField[] {
  return sections.flatMap((section) => section.fields);
}

export function pageFieldKeys(page: IntakePage): string[] {
  return flattenFields(page).map((field) => field.key);
}

export function useIntakeSchema({
  sections,
  readingId,
  pagination,
}: UseIntakeSchemaArgs): UseIntakeSchemaResult {
  const allFields = useMemo(() => flattenFields(sections), [sections]);

  const timeUnknownPairs = useMemo(() => {
    const pairs = new Map<string, string>();
    const fieldKeys = new Set(allFields.map((f) => f.key));
    for (const field of allFields) {
      if (field.type !== "time") continue;
      const candidate = `${field.key}${COMPANION_SUFFIX_UNKNOWN}`;
      if (fieldKeys.has(candidate)) pairs.set(field.key, candidate);
    }
    return pairs;
  }, [allFields]);

  const pairedUnknownKeys = useMemo(
    () => new Set(timeUnknownPairs.values()),
    [timeUnknownPairs],
  );

  const timeUnknownLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const [timeKey, unknownKey] of timeUnknownPairs) {
      const target = allFields.find((field) => field.key === unknownKey);
      if (target) labels.set(timeKey, target.label);
    }
    return labels;
  }, [allFields, timeUnknownPairs]);

  const submissionSchema = useMemo(
    () => buildSubmissionSchema(allFields),
    [allFields],
  );

  const pages = useMemo(
    () => derivePages(sections, { readingSlug: readingId, pagination }),
    [sections, readingId, pagination],
  );

  const defaultValues = useMemo<FieldValues>(() => {
    const seed: FieldValues = {};
    for (const field of allFields) {
      seed[field.key] = initialValueFor(field);
    }
    return seed;
  }, [allFields]);

  const defaultValuesSnapshot = useMemo(
    () => JSON.stringify(defaultValues),
    [defaultValues],
  );

  return {
    allFields,
    pages,
    totalPages: pages.length,
    submissionSchema,
    timeUnknownPairs,
    timeUnknownLabels,
    pairedUnknownKeys,
    defaultValues,
    defaultValuesSnapshot,
  };
}
