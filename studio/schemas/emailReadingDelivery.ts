import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateReadingDeliverySlots = slotValidation("emailReadingDelivery");

export const emailReadingDelivery = defineType({
  name: "emailReadingDelivery",
  title: "Reading Delivery Email → Customer",
  type: "document",
  description:
    "Sent to the customer (self-purchaser or gift recipient) when their reading is ready, with the voice note and PDF link inside. The customer can sign back in to listen again for 90 days from delivery.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
  ],
  fields: [
    tokenReferenceField("emailReadingDelivery"),
    defineField({
      name: "subjectTemplate",
      title: "Subject",
      type: "string",
      group: "envelope",
      description: 'Use "{readingName}" to insert the reading name (e.g. "Soul Blueprint").',
      validation: validateReadingDeliverySlots,
      initialValue: "Your {readingName} is ready",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      group: "envelope",
      description: "Inbox preview snippet shown under the subject.",
      initialValue: "A short note before you press play.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "body",
      initialValue: "Your reading is ready",
    }),
    defineField({
      name: "bodyIntro",
      title: "Body — before button",
      type: "array",
      group: "body",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        'Body paragraphs shown above the open-reading button. Use "{firstName}" + "{readingName}".',
      validation: validateReadingDeliverySlots,
    }),
    defineField({
      name: "openButtonLabel",
      title: "Open-reading button label",
      type: "string",
      group: "body",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "bodyPostButton",
      title: "Body — after button",
      type: "array",
      group: "body",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        "Body paragraphs shown below the open-reading button — sign-in disclosure, 90-day window, follow-up invitation.",
      validation: validateReadingDeliverySlots,
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card — label",
      type: "string",
      group: "card",
      description: "Uppercase mini-label above the reading name.",
      initialValue: "Your reading",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card — delivery line",
      type: "string",
      group: "card",
      initialValue: "Voice note + PDF",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Reading Delivery Email → Customer",
      subtitle:
        "Sent to the customer (self-purchaser or gift recipient) when their reading is ready, with the voice note and PDF link inside. The customer can sign back in to listen again for 90 days from delivery.",
    }),
  },
});
