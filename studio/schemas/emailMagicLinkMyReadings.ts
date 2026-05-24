import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateMagicLinkSlots = slotValidation("emailMagicLinkMyReadings");

export const emailMagicLinkMyReadings = defineType({
  name: "emailMagicLinkMyReadings",
  title: "Email — Magic Link (My Readings)",
  type: "document",
  description:
    "Sent when a customer requests a sign-in link from the My Readings page. Same auth surface as the listen-page magic link, different framing — this one is about the library, not a single reading.",
  fields: [
    tokenReferenceField("emailMagicLinkMyReadings"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "Open your readings",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      description: "Inbox preview snippet — displayed under subject in most clients.",
      initialValue: "A fresh link to your readings.",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      validation: validateMagicLinkSlots,
      initialValue: "Hi,",
    }),
    defineField({
      name: "body",
      title: "Body paragraphs",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        "Body paragraphs. Bold/italic via toolbar; links via the link button. Order = render order.",
      validation: validateMagicLinkSlots,
    }),
    defineField({
      name: "signOff",
      title: "Sign-off line",
      type: "string",
      description: 'Optional — leave blank to use the default "With love, Josephine ✦".',
    }),
  ],
  preview: {
    prepare: () => ({ title: "Email — Magic Link (My Readings)" }),
  },
});
