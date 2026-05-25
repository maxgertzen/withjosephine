import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateMagicLinkSlots = slotValidation("emailMagicLink");

export const emailMagicLink = defineType({
  name: "emailMagicLink",
  title: "Email — Magic Link",
  type: "document",
  description:
    "Sent when a customer or gift recipient requests a sign-in link. The link is generic — this email goes to anyone trying to authenticate, including strangers who don't have a reading yet, so no customer-specific tokens are available here.",
  fields: [
    tokenReferenceField("emailMagicLink"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      description: "Inbox preview snippet — displayed under subject in most clients.",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "buttonLabel",
      title: "Button label",
      type: "string",
      initialValue: "Open your reading",
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
        "Body paragraphs. Bold/italic via the toolbar; links via the link button. Each block becomes one paragraph in the email.",
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
    prepare: () => ({ title: "Email — Magic Link" }),
  },
});
