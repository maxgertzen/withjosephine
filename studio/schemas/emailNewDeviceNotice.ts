import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateNewDeviceSlots = slotValidation("emailNewDeviceNotice");

export const emailNewDeviceNotice = defineType({
  name: "emailNewDeviceNotice",
  title: "New device notice → Customer",
  type: "document",
  description:
    "Fired passively from the listen-page render when a reading is opened from a browser the system has not seen before for that submission. Warm informational framing, not a security alert. Carries a 'This was not me' button that revokes the recipient's sessions and flags Josephine.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "body", title: "Body copy" },
  ],
  fields: [
    tokenReferenceField("emailNewDeviceNotice"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      validation: validateNewDeviceSlots,
      initialValue: "Was this you?",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      group: "envelope",
      description: "Inbox preview snippet shown under the subject.",
      validation: validateNewDeviceSlots,
      initialValue: "We noticed your reading was opened from a new device.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line",
      type: "string",
      group: "body",
      validation: validateNewDeviceSlots,
      initialValue: "Was this you?",
    }),
    defineField({
      name: "bodyIntro",
      title: "Body: before button",
      type: "array",
      group: "body",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description:
        "Body paragraphs shown above the 'This was not me' button. Use \"{firstName}\".",
      validation: validateNewDeviceSlots,
    }),
    defineField({
      name: "wasItYouButtonLabel",
      title: "Revoke button label",
      type: "string",
      group: "body",
      description: "Primary CTA on the email. Tapping signs the recipient out of all devices.",
      initialValue: "This was not me",
    }),
    defineField({
      name: "bodyPostButton",
      title: "Body: after button",
      type: "array",
      group: "body",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      description: "Body paragraphs shown below the button. What happens, soft reassurance.",
      validation: validateNewDeviceSlots,
    }),
    defineField({
      name: "signOff",
      title: "Sign-off (optional)",
      type: "string",
      group: "body",
      description: "Leave empty to use the shared brand sign-off.",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "New device notice → Customer",
      subtitle:
        "Fired when a reading is opened from a previously-unseen browser. Carries a 'This was not me' revoke button. Passive informational tone.",
    }),
  },
});
