import { z } from "zod";

import type { SanityFormField, SanityFormFieldOption } from "@/lib/sanity/types";

import {
  isNameFollowupEnabled,
  NAME_FOLLOWUP_MAX_LENGTH,
  nameFollowupKey,
} from "./nameFollowup";

export type NameFollowupSelection = {
  fieldKey: string;
  option: SanityFormFieldOption;
  key: string;
};

export function selectedNameFollowups(
  fields: SanityFormField[],
  values: Record<string, unknown>,
): NameFollowupSelection[] {
  const result: NameFollowupSelection[] = [];
  for (const field of fields) {
    if (field.type !== "multiSelectExact") continue;
    const selected = values[field.key];
    if (!Array.isArray(selected)) continue;
    for (const option of field.options ?? []) {
      if (!isNameFollowupEnabled(option)) continue;
      if (!selected.includes(option.value)) continue;
      result.push({ fieldKey: field.key, option, key: nameFollowupKey(option.value) });
    }
  }
  return result;
}

export function buildNameFollowupSchema(
  fields: SanityFormField[],
  values: Record<string, unknown>,
): z.ZodObject<Record<string, z.ZodString>> {
  const shape: Record<string, z.ZodString> = {};
  for (const entry of selectedNameFollowups(fields, values)) {
    shape[entry.key] = z
      .string()
      .min(1, "Please add their name.")
      .max(NAME_FOLLOWUP_MAX_LENGTH, `Maximum ${NAME_FOLLOWUP_MAX_LENGTH} characters.`);
  }
  return z.object(shape);
}
