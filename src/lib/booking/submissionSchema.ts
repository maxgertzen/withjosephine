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
      if (typeof max === "number") {
        schema = schema.max(max, `Please keep this under ${max} characters.`);
      }
      const patternSource = field.validation?.pattern;
      if (patternSource) {
        try {
          schema = schema.regex(new RegExp(patternSource), {
            message: field.validation?.patternErrorMessage ?? "Please check the format.",
          });
        } catch {
          // Sanity stored an invalid pattern — ignore rather than crash submissions.
        }
      }
      if (required) {
        return schema.min(min ?? 1, "Please fill this in.");
      }
      if (typeof min === "number") {
        return schema.min(min, `Please use at least ${min} characters.`).optional();
      }
      return schema.optional();
    }

    case "email": {
      const schema = z
        .string()
        .min(1, "Please enter your email.")
        .email("Please enter a valid email address.");
      return required ? schema : schema.optional();
    }

    case "date": {
      const schema = z.string().regex(ISO_DATE, "Please enter a valid date.");
      return required
        ? z.string().min(1, "Please pick a date.").regex(ISO_DATE, "Please enter a valid date.")
        : schema.optional();
    }

    case "time": {
      const validTime = z.string().regex(HHMM, "Please enter a valid time (HH:MM).");
      const schema = z.union([validTime, z.literal(TIME_UNKNOWN_SENTINEL)]);
      if (!required) return schema.optional();
      return z
        .string()
        .min(1, "Please enter a time, or check “I don\u2019t know”.")
        .pipe(schema);
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
      if (required) {
        return z.array(item).length(count, `Please choose exactly ${count}.`);
      }
      // Optional multiSelectExact: blank is acceptable, but if filled the
      // count must still be exact (the field type's defining constraint).
      return z.array(item).refine(
        (arr) => arr.length === 0 || arr.length === count,
        { message: `Please choose exactly ${count}, or leave blank.` },
      );
    }

    case "fileUpload": {
      const bypass =
        process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS === "1";
      if (bypass) return z.string().optional();
      const schema = z.string().min(1, "Please upload a file.");
      return required ? schema : schema.optional();
    }

    case "placeAutocomplete": {
      const schema = z.string().min(1, "Please choose a place.");
      return required ? schema : schema.optional();
    }

    case "consent": {
      const bypass =
        process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS === "1";
      if (bypass) return z.boolean().optional();
      if (!required) return z.boolean().optional();
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
    if (field.type === "consent") continue;
    shape[field.key] = buildFieldSchema(field);
  }
  return z.object(shape);
}
