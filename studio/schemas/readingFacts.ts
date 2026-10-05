import { defineField } from "sanity";

import { MAX_READING_FACTS } from "../../src/data/defaults";
import { FactsPerRowSlider } from "../components/FactsPerRowSlider";

type FieldPlacement = { description: string; fieldset?: string; group?: string };

export function readingFactsField(placement: FieldPlacement) {
  return defineField({
    name: "facts",
    title: "Facts Row",
    type: "array",
    ...placement,
    of: [
      {
        type: "object",
        name: "readingFact",
        fields: [
          defineField({ name: "label", title: "Label", type: "string", validation: (rule) => rule.required() }),
          defineField({ name: "value", title: "Value", type: "string", validation: (rule) => rule.required() }),
        ],
        preview: { select: { title: "label", subtitle: "value" } },
      },
    ],
    validation: (rule) => rule.max(MAX_READING_FACTS),
  });
}

export function hideFactsField(placement: FieldPlacement) {
  return defineField({
    name: "hideFacts",
    title: "Hide the Facts Row",
    type: "boolean",
    ...placement,
    initialValue: false,
  });
}

export function factsPerRowField(options: { name: string; title: string; initialValue: number; fieldset?: string }) {
  return defineField({
    name: options.name,
    title: options.title,
    type: "number",
    fieldset: options.fieldset,
    initialValue: options.initialValue,
    components: { input: FactsPerRowSlider },
    validation: (rule) => rule.integer().min(1).max(MAX_READING_FACTS),
  });
}
