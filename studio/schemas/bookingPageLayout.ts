import { type ArrayActionName, defineArrayMember, defineField } from "sanity";

import {
  BOOKING_PAGE_ELEMENTS,
  type BookingPageLayoutEntry,
  chooseLayoutEntries,
  defaultBookingPageLayoutEntries,
  normalizeLayoutEntries,
} from "../../src/lib/booking/pageLayout";
import { inheritedArrayInput } from "../components/InheritedArrayInput";

const ITEM_TYPE = "bookingPageElement";
const SHARED_LAYOUT_QUERY = `*[_type == "bookingForm"][0].pageLayout[]{ element, hidden, insideForm }`;

function titleOf(element: string | null | undefined) {
  return BOOKING_PAGE_ELEMENTS.find(({ key }) => key === element)?.title ?? String(element);
}

function stateOf({ element, hidden, insideForm }: BookingPageLayoutEntry) {
  if (element === "form") return "Always shown";
  if (hidden) return "Hidden";
  if (element === "testimonial" && insideForm !== false) return "Inside the form, on its last page";
  return "Shown";
}

const describe = (entry: BookingPageLayoutEntry) => ({ title: titleOf(entry.element), subtitle: stateOf(entry) });

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
    defineField({
      name: "hidden",
      title: "Hide on the page",
      type: "boolean",
      initialValue: false,
      hidden: ({ parent }) => parent?.element === "form",
    }),
    defineField({
      name: "insideForm",
      title: "Inside the form, on its last page",
      type: "boolean",
      description: "On: the quote sits above the consent boxes on the form's last page. Off: it shows where it sits in this list.",
      initialValue: true,
      hidden: ({ parent }) => parent?.element !== "testimonial",
    }),
  ],
  preview: {
    select: { element: "element", hidden: "hidden", insideForm: "insideForm" },
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
    "Drag the parts of every booking page into the order you want, and open one to hide it. Parts below The form show under the form's frame. A reading can have its own order.",
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
      "Leave as it is to use the order from Booking Form. Change it to give this reading's booking page its own order.",
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
