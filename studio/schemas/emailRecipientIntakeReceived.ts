import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateRecipientIntakeSlots = slotValidation("emailRecipientIntakeReceived");

export const emailRecipientIntakeReceived = defineType({
  name: "emailRecipientIntakeReceived",
  title: "Intake Received → Gift Recipient",
  type: "document",
  description:
    "Sent to a gift recipient right after they finish filling out their intake form. Confirms their answers came through and tells them the reading will arrive within 7 days.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailRecipientIntakeReceived"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      description: 'Use "{recipientName}" / "{readingName}" placeholders.',
      validation: validateRecipientIntakeSlots,
      initialValue: "Your reading is in my hands now",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      initialValue: "Your answers landed safely — here's what happens next.",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "brandName",
      title: "Brand wordmark",
      type: "string",
      group: "header",
      initialValue: "Josephine",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "brandSubtitle",
      title: "Brand sub-line",
      type: "string",
      group: "header",
      initialValue: "Soul Readings",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
      initialValue: "Your reading is in my hands",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'The full body of the email. Bold/italic/link via the toolbar. Use "{recipientName}", "{purchaserFirstName}", "{readingName}" placeholders.',
      validation: validateRecipientIntakeSlots,
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card — label",
      type: "string",
      group: "card",
      initialValue: "Your reading",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card — delivery line",
      type: "string",
      group: "card",
      initialValue: "Delivery within 7 days",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "signOffLine1",
      title: "Sign-off line 1",
      type: "string",
      group: "footer",
      initialValue: "With love,",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "signOffLine2",
      title: "Sign-off line 2",
      type: "string",
      group: "footer",
      initialValue: "Josephine ✦",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "footerDisclaimer",
      title: "Footer disclaimer",
      type: "string",
      group: "footer",
      initialValue: "Readings are offered for entertainment and personal reflection.",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Intake Received → Gift Recipient",
      subtitle:
        "Sent to a gift recipient right after they finish filling out their intake form. Confirms their answers came through and tells them the reading will arrive within 7 days.",
    }),
  },
});
