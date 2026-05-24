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
      name: "greeting",
      title: "Greeting line",
      type: "string",
      description: 'Use "{firstName}" to insert the recipient\'s first name.',
      validation: validateDay7Slots,
      initialValue: "Hi {firstName},",
    }),
    defineField({
      name: "lineReady",
      title: '"Ready" line',
      type: "string",
      description: 'Use "{readingName}" to insert the reading name.',
      validation: validateDay7Slots,
      initialValue: "Your {readingName} is here.",
    }),
    defineField({
      name: "comfortLine",
      title: "Comfort + setup line",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description: "Bold/italic/link via toolbar.",
    }),
    defineField({
      name: "openButtonLabel",
      title: "Open-reading button label",
      type: "string",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "signedInDisclosure",
      title: "7-day sign-in disclosure paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description: "Bold/italic/link via toolbar.",
    }),
    defineField({
      name: "comfortFollowUp",
      title: "Follow-up invitation paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description: "Bold/italic/link via toolbar.",
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
