import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateMagicLinkSlots = slotValidation("emailMagicLinkMyReadings");

export const emailMagicLinkMyReadings = defineType({
  name: "emailMagicLinkMyReadings",
  title: "Magic Link → My Readings",
  type: "document",
  description:
    "Sent to a customer who asks for a sign-in link from the My Readings page, where they can see every reading they own. The link works for 24 hours and the sign-in stays active for 7 days after they use it.",
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
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      initialValue: "Open your readings",
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      type: "string",
      initialValue: "Open my readings",
    }),
    defineField({
      name: "greeting",
      title: "Greeting (legacy — folded into Body)",
      type: "string",
      hidden: true,
      readOnly: true,
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
    prepare: () => ({
      title: "Magic Link → My Readings",
      subtitle:
        "Sent to a customer who asks for a sign-in link from the My Readings page, where they can see every reading they own. The link works for 24 hours and the sign-in stays active for 7 days after they use it.",
    }),
  },
});
