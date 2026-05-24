import { defineField, defineType } from "sanity";

import { tokenHelp } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

export const emailPrivacyExport = defineType({
  name: "emailPrivacyExport",
  title: "Email — Privacy Export (GDPR Art. 20)",
  type: "document",
  description: tokenHelp(
    "emailPrivacyExport",
    "Sent in response to a GDPR Article 20 data-portability request. Contains a 7-day-expiring pre-signed download URL for the user's reading data ZIP.",
  ),
  fields: [
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
      name: "greeting",
      title: "Greeting",
      type: "string",
      initialValue: "Hi,",
    }),
    defineField({
      name: "introLine",
      title: "Intro paragraph",
      type: "text",
      rows: 2,
      initialValue: "Your Josephine data export is ready.",
    }),
    defineField({
      name: "contentsLine",
      title: "Contents paragraph",
      type: "text",
      rows: 3,
      description:
        'Use "{submissionCount}" to insert how many readings the export contains.',
      validation: slotValidation("emailPrivacyExport"),
      initialValue:
        "It contains the data we hold for your {submissionCount} reading(s) — intake answers, consent records, transactional records, photos, voice notes, and PDFs (where delivered).",
    }),
    defineField({
      name: "ctaLabel",
      title: "Download button label",
      type: "string",
      initialValue: "Download your export (ZIP)",
    }),
    defineField({
      name: "expiryLine",
      title: "Expiry paragraph",
      type: "text",
      rows: 2,
      description:
        'Use "{expiryDays}" to insert the link lifetime in days.',
      validation: slotValidation("emailPrivacyExport"),
      initialValue:
        "This link expires in {expiryDays} days. If you have any questions, reply to this email or write to hello@withjosephine.com.",
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
