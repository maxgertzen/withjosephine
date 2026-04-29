import { z, type ZodTypeAny } from "zod";

import type { SanityFormField } from "@/lib/sanity/types";

import { buildFieldSchema, type DynamicSchema } from "./submissionSchema";

export function buildPageSchema(
  fields: SanityFormField[],
  pageFieldKeys: string[],
): DynamicSchema {
  const allowed = new Set(pageFieldKeys);
  const shape: Record<string, ZodTypeAny> = {};
  for (const field of fields) {
    if (allowed.has(field.key)) {
      shape[field.key] = buildFieldSchema(field);
    }
  }
  return z.object(shape);
}
