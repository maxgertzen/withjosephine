import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

export const emailPrivacyExport = defineType({
  name: "emailPrivacyExport",
  title: "Privacy Export → Requester (GDPR)",
  type: "document",
  description:
    "Sent in response to a GDPR data-portability request, with a download link for the requester's reading data as a ZIP file. The download link expires in 7 days.",
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
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      initialValue: "Your data export is ready",
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
      name: "signOff",
      title: "Sign-off line",
      type: "string",
      description: 'Optional — leave blank to use the default "With love, Josephine ✦".',
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Privacy Export → Requester (GDPR)",
      subtitle:
        "Sent in response to a GDPR data-portability request, with a download link for the requester's reading data as a ZIP file. The download link expires in 7 days.",
    }),
  },
});
