import { defineField } from "sanity";

import { MAX_READING_FACTS, READING_PAGE_DEFAULTS, type ReadingFact } from "../../src/data/defaults";
import { sharedFacts } from "../../src/lib/booking/pageFacts";
import { FactsPerRowSlider } from "../components/FactsPerRowSlider";
import { inheritedArrayInput } from "../components/InheritedArrayInput";

type FieldPlacement = { description: string; fieldset?: string; group?: string };

const ITEM_TYPE = "readingFact";
const SHARED_FACTS_QUERY = `*[_type == "bookingForm"][0].readingPageContent{ facts[]{ label, value } }`;
const describe = ({ label, value }: ReadingFact) => ({ title: label, subtitle: value });

const builtInFactsInput = inheritedArrayInput<ReadingFact>({
  loadInherited: async () => READING_PAGE_DEFAULTS.facts,
  describe,
  itemType: ITEM_TYPE,
  inheritedHeading: "The built-in facts are in use:",
  copyLabel: "Change the facts",
  resetLabel: "Use the built-in facts again",
  emptyListInherits: false,
});

const bookingFormFactsInput = inheritedArrayInput<ReadingFact>({
  loadInherited: async (client) =>
    sharedFacts(
      await client
        .withConfig({ perspective: "published" })
        .fetch<{ facts?: ReadingFact[] | null } | null>(SHARED_FACTS_QUERY),
    ),
  describe,
  itemType: ITEM_TYPE,
  inheritedHeading: "This reading uses the published facts from Booking Form:",
  inheritedEmptyText: "Booking Form shows no facts, so this reading shows none.",
  loadFailedText: "The Booking Form facts could not be loaded. Reload the page to try again.",
  copyLabel: "Give this reading its own facts",
  resetLabel: "Use the facts from Booking Form again",
});

export function readingFactsField({
  inherits,
  ...placement
}: FieldPlacement & { inherits: "builtIn" | "bookingForm" }) {
  return defineField({
    name: "facts",
    title: "Facts Row",
    type: "array",
    ...placement,
    components: { input: inherits === "builtIn" ? builtInFactsInput : bookingFormFactsInput },
    of: [
      {
        type: "object",
        name: ITEM_TYPE,
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
