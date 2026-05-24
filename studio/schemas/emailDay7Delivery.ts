import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateDay7Slots = slotValidation("emailDay7Delivery");

export const emailDay7Delivery = defineType({
  name: "emailDay7Delivery",
  title: "Email — Day-7 Delivery",
  type: "document",
  description:
    "Sent to the customer when their reading is ready — voice note + PDF link inside.",
  fields: [
    tokenReferenceField("emailDay7Delivery"),
    defineField({
      name: "subjectTemplate",
      title: "Subject",
      type: "string",
      description: 'Use "{readingName}" to insert the reading name (e.g. "Soul Blueprint").',
      validation: validateDay7Slots,
      initialValue: "Your {readingName} is ready",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      description: "Inbox preview snippet shown under the subject.",
      initialValue: "A short note before you press play.",
    }),
    defineField({
      name: "bodyIntro",
      title: "Body — before button",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        'Body paragraphs shown above the open-reading button. Use "{firstName}" + "{readingName}".',
      validation: validateDay7Slots,
    }),
    defineField({
      name: "openButtonLabel",
      title: "Open-reading button label",
      type: "string",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "bodyPostButton",
      title: "Body — after button",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        "Body paragraphs shown below the open-reading button — sign-in disclosure, 90-day window, follow-up invitation.",
      validation: validateDay7Slots,
    }),
    defineField({
      name: "greeting",
      title: "Greeting line (legacy — folded into Body)",
      type: "string",
      hidden: true,
      readOnly: true,
      validation: validateDay7Slots,
      initialValue: "Hi {firstName},",
    }),
    defineField({
      name: "lineReady",
      title: '"Ready" line (legacy — folded into Body)',
      type: "string",
      hidden: true,
      readOnly: true,
      validation: validateDay7Slots,
      initialValue: "Your {readingName} is here.",
    }),
    defineField({
      name: "comfortLine",
      title: "Comfort + setup line (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "signedInDisclosure",
      title: "7-day sign-in disclosure paragraph (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "accessWindowLine",
      title: "90-day access window paragraph (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "comfortFollowUp",
      title: "Follow-up invitation paragraph (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "signOff",
      title: "Sign-off line",
      type: "string",
      description: 'Optional — leave blank to use the default "With love, Josephine ✦".',
    }),
  ],
  preview: {
    prepare: () => ({ title: "Email — Day-7 Delivery" }),
  },
});
