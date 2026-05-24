import { defineField, defineType } from "sanity";

import { tokenHelp } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateDay7Slots = slotValidation("emailDay7Delivery");

export const emailDay7Delivery = defineType({
  name: "emailDay7Delivery",
  title: "Email — Day-7 Delivery",
  type: "document",
  description: tokenHelp(
    "emailDay7Delivery",
    "Sent to the customer when their reading is ready — voice note + PDF link inside.",
  ),
  fields: [
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
      type: "text",
      rows: 2,
      initialValue:
        "Open it whenever the timing feels right — it's saved to you, not to a deadline. Headphones if you have them, somewhere quiet if you can.",
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
      type: "text",
      rows: 3,
      initialValue:
        "One small thing: opening this from the link above signs you into your reading for the next seven days, so you can come back to the voice note and the PDF without asking again. After that, just tell us your email and we'll send you back in.",
    }),
    defineField({
      name: "comfortFollowUp",
      title: "Follow-up invitation paragraph",
      type: "text",
      rows: 2,
      initialValue:
        "If anything you hear sits hard, or a question opens up after, write to me. I'd rather know than not.",
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
