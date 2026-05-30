import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateDay7Slots = slotValidation("emailDay7Delivery");

export const emailDay7Delivery = defineType({
  name: "emailDay7Delivery",
  title: "Reading Delivery → Customer",
  type: "document",
  description:
    "Sent to the customer (self-purchaser or gift recipient) when their reading is ready, with the voice note and PDF link inside. The customer can sign back in to listen again for 90 days from delivery.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailDay7Delivery"),
    defineField({
      name: "subjectTemplate",
      title: "Subject",
      type: "string",
      group: "envelope",
      description: 'Use "{readingName}" to insert the reading name (e.g. "Soul Blueprint").',
      validation: validateDay7Slots,
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
      hidden: true,
      readOnly: true,
      name: "brandName",
      title: "Brand wordmark",
      type: "string",
      group: "header",
      initialValue: "Josephine",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "brandSubtitle",
      title: "Brand sub-line",
      type: "string",
      group: "header",
      initialValue: "Soul Readings",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
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
      validation: validateDay7Slots,
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
      validation: validateDay7Slots,
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
    defineField({
      hidden: true,
      readOnly: true,
      name: "signOffLine1",
      title: "Sign-off line 1",
      type: "string",
      group: "footer",
      initialValue: "With love,",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "signOffLine2",
      title: "Sign-off line 2",
      type: "string",
      group: "footer",
      initialValue: "Josephine ✦",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "footerDisclaimer",
      title: "Footer disclaimer",
      type: "string",
      group: "footer",
      initialValue: "Readings are offered for entertainment and personal reflection.",
    }),
    defineField({
      name: "signOff",
      title: "Sign-off line (legacy — superseded by signOffLine1 + signOffLine2)",
      type: "string",
      hidden: true,
      readOnly: true,
      description: 'Optional — leave blank to use the default "With love, Josephine ✦".',
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Reading Delivery → Customer",
      subtitle:
        "Sent to the customer (self-purchaser or gift recipient) when their reading is ready, with the voice note and PDF link inside. The customer can sign back in to listen again for 90 days from delivery.",
    }),
  },
});
