import { defineField } from "sanity";

import { MAX_READING_FACTS } from "../../src/data/defaults";
import { FactsPerRowSlider } from "../components/FactsPerRowSlider";

export function readingFactsField(options: { description: string; fieldset?: string }) {
  return defineField({
    name: "facts",
    title: "Facts Row",
    type: "array",
    fieldset: options.fieldset,
    description: options.description,
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

export function hideFactsField(options: { description: string; fieldset?: string }) {
  return defineField({
    name: "hideFacts",
    title: "Hide the Facts Row",
    type: "boolean",
    fieldset: options.fieldset,
    description: options.description,
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
