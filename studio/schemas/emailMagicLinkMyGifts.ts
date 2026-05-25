import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateMagicLinkSlots = slotValidation("emailMagicLinkMyGifts");

export const emailMagicLinkMyGifts = defineType({
  name: "emailMagicLinkMyGifts",
  title: "Magic Link → My Gifts",
  type: "document",
  description:
    "Sent to a purchaser who asks for a sign-in link from the My Gifts dashboard, where they manage scheduled gifts and regenerate claim links. The link works for 24 hours and the sign-in stays active for 7 days after they use it.",
  fields: [
    tokenReferenceField("emailMagicLinkMyGifts"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "Open your gifts dashboard",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      description: "Inbox preview snippet — displayed under subject in most clients.",
      initialValue: "A fresh link to your gifts.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      initialValue: "Open your gifts dashboard",
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      type: "string",
      initialValue: "Open my gifts",
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
    prepare: () => ({ title: "Email — Magic Link (My Gifts)" }),
  },
});
