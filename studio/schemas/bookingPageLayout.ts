import { type ArrayActionName, defineArrayMember, defineField } from "sanity";

import {
  BOOKING_PAGE_ELEMENTS,
  type BookingPageElement,
  type BookingPageLayoutEntry,
  chooseLayoutEntries,
  defaultBookingPageLayoutEntries,
  HIDEABLE_ELEMENTS,
  normalizeLayoutEntries,
} from "../../src/lib/booking/pageLayout";
import { inheritedArrayInput } from "../components/InheritedArrayInput";

const ITEM_TYPE = "bookingPageElement";
const SHARED_LAYOUT_QUERY = `*[_type == "bookingForm"][0].pageLayout[]{ element }`;

const ROW_NOTES: Partial<Record<BookingPageElement, string>> = {
  questions: "Picked per reading in Questions on this page",
  testimonial: "Inside the form unless that switch is off",
  form: "Always shown",
};

function titleOf(element: string | null | undefined) {
  return BOOKING_PAGE_ELEMENTS.find(({ key }) => key === element)?.title ?? String(element);
}

const describe = ({ element }: BookingPageLayoutEntry) => ({
  title: titleOf(element),
  subtitle: ROW_NOTES[element as BookingPageElement],
});

const elementMember = defineArrayMember({
  type: "object",
  name: ITEM_TYPE,
  fields: [
    defineField({
      name: "element",
      title: "Part of the page",
      type: "string",
      readOnly: true,
      options: { list: BOOKING_PAGE_ELEMENTS.map(({ key, title }) => ({ value: key, title })) },
    }),
  ],
  preview: {
    select: { element: "element" },
    prepare: (entry: BookingPageLayoutEntry) => describe(entry),
  },
});

const DRAG_ONLY: { disableActions: ArrayActionName[] } = {
  disableActions: ["add", "addBefore", "addAfter", "duplicate", "copy", "remove"],
};

const UP_TO_DATE = { apply: normalizeLayoutEntries, label: "Add the new parts of the page to this list" };

const baseField = {
  name: "pageLayout",
  type: "array" as const,
  of: [elementMember],
  options: DRAG_ONLY,
};

export const sharedBookingPageLayoutField = defineField({
  ...baseField,
  title: "Booking page order",
  description:
    "Drag the parts into the order every booking page shows them. Parts below The form show under the form's box. To hide a part, tick it in Hide on every booking page.",
  components: {
    input: inheritedArrayInput<BookingPageLayoutEntry>({
      loadInherited: async () => defaultBookingPageLayoutEntries(),
      describe,
      itemType: ITEM_TYPE,
      inheritedHeading: "The built-in order is in use:",
      loadFailedText: "The order could not be loaded. Reload the page to try again.",
      copyLabel: "Change the order",
      upToDate: UP_TO_DATE,
    }),
  },
});

export function readingBookingPageLayoutField(group: string) {
  return defineField({
    ...baseField,
    title: "Booking page order for this reading",
    group,
    description:
      "Leave as it is to use the order from Booking Form. Change it to give this reading's booking page its own order. To hide parts, use Also hide on this reading.",
    components: {
      input: inheritedArrayInput<BookingPageLayoutEntry>({
        loadInherited: async (client) =>
          normalizeLayoutEntries(
            chooseLayoutEntries(
              null,
              await client
                .withConfig({ perspective: "published" })
                .fetch<BookingPageLayoutEntry[] | null>(SHARED_LAYOUT_QUERY),
            ),
          ),
        describe,
        itemType: ITEM_TYPE,
        inheritedHeading: "This reading uses the published order from Booking Form:",
        loadFailedText: "The Booking Form order could not be loaded. Reload the page to try again.",
        copyLabel: "Give this reading its own order",
        resetLabel: "Use the order from Booking Form again",
        upToDate: UP_TO_DATE,
      }),
    },
  });
}

function hiddenPartsField(field: { title: string; description: string; group?: string }) {
  return defineField({
    ...field,
    name: "hiddenParts",
    type: "array",
    of: [{ type: "string" }],
    options: { list: HIDEABLE_ELEMENTS.map(({ key, title }) => ({ value: key, title })) },
  });
}

export const hiddenEverywhereField = hiddenPartsField({
  title: "Hide on every booking page",
  description:
    "Tick a part to hide it on every reading's booking page. Untick it to show it again. A reading can hide more parts in Also hide on this reading.",
});

export function hiddenOnReadingField(group: string) {
  return hiddenPartsField({
    title: "Also hide on this reading",
    group,
    description:
      "Tick parts to hide on this reading's booking page only. Parts ticked in Hide on every booking page, on Booking Form, stay hidden here too.",
  });
}

export const testimonialInsideFormField = defineField({
  name: "testimonialInsideForm",
  title: "Put the testimonial inside the form, on its last page",
  type: "boolean",
  initialValue: true,
  description:
    "On: the reading's quote sits above the consent boxes on the form's last page. Off: it shows at its place in Booking page order.",
});
