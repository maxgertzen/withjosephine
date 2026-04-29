import { z, type ZodTypeAny } from "zod";

import type { SanityFormField } from "@/lib/sanity/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

export const TIME_UNKNOWN_SENTINEL = "unknown";

export function buildFieldSchema(field: SanityFormField): ZodTypeAny {
  const required = field.required === true;

  switch (field.type) {
    case "shortText":
    case "longText": {
      let schema = z.string();
      const min = field.validation?.minLength;
      const max = field.validation?.maxLength;
      if (typeof min === "number") schema = schema.min(min);
      if (typeof max === "number") schema = schema.max(max);
      const patternSource = field.validation?.pattern;
      if (patternSource) {
        try {
          schema = schema.regex(new RegExp(patternSource), {
            message: field.validation?.patternErrorMessage ?? "Invalid format.",
          });
        } catch {
          // Sanity stored an invalid pattern — ignore rather than crash submissions.
        }
      }
      return required ? schema.min(min ?? 1, "This field is required.") : schema.optional();
    }

    case "email": {
      const schema = z.string().email("Please enter a valid email address.");
      return required ? schema : schema.optional();
    }

    case "date": {
      const schema = z.string().regex(ISO_DATE, "Please enter a valid date.");
      return required ? schema : schema.optional();
    }

    case "time": {
      const schema = z.union([
        z.string().regex(HHMM, "Please enter a valid time (HH:MM)."),
        z.literal(TIME_UNKNOWN_SENTINEL),
      ]);
      return required ? schema : schema.optional();
    }

    case "select": {
      const values = (field.options ?? []).map((option) => option.value);
      if (values.length === 0) {
        return required ? z.string().min(1, "Please select an option.") : z.string().optional();
      }
      const schema = z.enum(values as [string, ...string[]]);
      return required ? schema : schema.optional();
    }

    case "multiSelectExact": {
      const count = field.multiSelectCount ?? 0;
      const values = (field.options ?? []).map((option) => option.value);
      const item =
        values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
      return z
        .array(item)
        .length(count, `Please choose exactly ${count}.`);
    }

    case "fileUpload": {
      const schema = z.string().min(1, "Please upload a file.");
      return required ? schema : schema.optional();
    }

    case "placeAutocomplete": {
      const schema = z.string().min(1, "Please choose a place.");
      return required ? schema : schema.optional();
    }

    case "consent": {
      return z.literal(true, "Please acknowledge to continue.");
    }

    default:
      return z.string().optional();
  }
}

export type DynamicSchema = z.ZodObject<Record<string, ZodTypeAny>>;

export function buildSubmissionSchema(fields: SanityFormField[]): DynamicSchema {
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}
