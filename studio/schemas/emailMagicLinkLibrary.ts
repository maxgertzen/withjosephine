import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateMagicLinkSlots = slotValidation("emailMagicLinkLibrary");

export const emailMagicLinkLibrary = defineType({
  name: "emailMagicLinkLibrary",
  title: "Magic Link → Library",
  type: "document",
  description:
    "Sent to a customer who asks for a sign-in link from the library, where they can see every reading they own and any gifts they've shared. The link works for 24 hours and the sign-in stays active for 7 days after they use it.",
  fields: [
    tokenReferenceField("emailMagicLinkLibrary"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "Sign in to your library",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      description: "Inbox preview snippet — displayed under subject in most clients.",
      initialValue: "A fresh sign-in link for your readings and gifts.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      initialValue: "Sign in to your library",
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      type: "string",
      initialValue: "Sign in",
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
      title: "Magic Link → Library",
      subtitle:
        "Sent to a customer who asks for a sign-in link from the library, where they can see every reading they own and any gifts they've shared. The link works for 24 hours and the sign-in stays active for 7 days after they use it.",
    }),
  },
});
