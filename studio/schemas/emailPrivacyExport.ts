import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

export const emailPrivacyExport = defineType({
  name: "emailPrivacyExport",
  title: "Email — Privacy Export (GDPR Art. 20)",
  type: "document",
  description:
    "Sent in response to a GDPR Article 20 data-portability request. Contains a 7-day-expiring pre-signed download URL for the user's reading data ZIP.",
  fields: [
    tokenReferenceField("emailPrivacyExport"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "Your Josephine data export",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      initialValue: "Your Josephine data export is ready",
    }),
    defineField({
      name: "bodyIntro",
      title: "Body — before button",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        'Body paragraphs shown above the download button. Use "{submissionCount}" to insert how many readings the export contains.',
      validation: slotValidation("emailPrivacyExport"),
    }),
    defineField({
      name: "ctaLabel",
      title: "Download button label",
      type: "string",
      initialValue: "Download your export (ZIP)",
    }),
    defineField({
      name: "bodyPostButton",
      title: "Body — after button",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        'Body paragraphs shown below the download button. Use "{expiryDays}" to insert the link lifetime in days.',
      validation: slotValidation("emailPrivacyExport"),
    }),
    defineField({
      name: "greeting",
      title: "Greeting (legacy — folded into Body)",
      type: "string",
      hidden: true,
      readOnly: true,
      initialValue: "Hi,",
    }),
    defineField({
      name: "introLine",
      title: "Intro paragraph (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "contentsLine",
      title: "Contents paragraph (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
      validation: slotValidation("emailPrivacyExport"),
    }),
    defineField({
      name: "expiryLine",
      title: "Expiry paragraph (legacy — folded into Body)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      hidden: true,
      readOnly: true,
      validation: slotValidation("emailPrivacyExport"),
    }),
    defineField({
      name: "signOff",
      title: "Sign-off line",
      type: "string",
      description: 'Optional — leave blank to use the default "With love, Josephine ✦".',
    }),
  ],
  preview: {
    prepare: () => ({ title: "Email — Privacy Export (GDPR Art. 20)" }),
  },
});
