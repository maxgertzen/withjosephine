import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateMagicLinkSlots = slotValidation("emailMagicLinkMyGifts");

export const emailMagicLinkMyGifts = defineType({
  name: "emailMagicLinkMyGifts",
  title: "Email — Magic Link (My Gifts)",
  type: "document",
  description:
    "Sent when a purchaser requests a sign-in link from the My Gifts dashboard (to manage scheduled gifts, regenerate claim links, etc.). Distinct from the listen-page link because the recipient context is gifting, not a reading they're about to open themselves.",
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
