import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateStepUpOtpSlots = slotValidation("emailStepUpOtp");

export const emailStepUpOtp = defineType({
  name: "emailStepUpOtp",
  title: "Step-up code → Purchaser",
  type: "document",
  description:
    "Sent to a purchaser when they attempt a high-risk change to a gift (edit recipient, send now, claim for yourself). Carries a 6-digit code that expires in 15 minutes. Once entered, the elevated session stays good for 10 minutes so back-to-back edits don't trigger more emails.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "body", title: "Body copy" },
  ],
  fields: [
    tokenReferenceField("emailStepUpOtp"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      validation: validateStepUpOtpSlots,
      initialValue: "Your verification code",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      group: "envelope",
      description: "Inbox preview snippet shown under the subject.",
      validation: validateStepUpOtpSlots,
      initialValue: "Your verification code",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line",
      type: "string",
      group: "body",
      validation: validateStepUpOtpSlots,
      initialValue: "Verify it's you",
    }),
    defineField({
      name: "intro",
      title: "Intro paragraph",
      type: "string",
      group: "body",
      description: "Sets context for why the code is needed.",
      validation: validateStepUpOtpSlots,
      initialValue:
        "We will email you a code to confirm. This protects against a forwarded link being misused.",
    }),
    defineField({
      name: "codeLabel",
      title: "Code label (above the code box)",
      type: "string",
      group: "body",
      validation: validateStepUpOtpSlots,
      initialValue: "Your code",
    }),
    defineField({
      name: "expiryLine",
      title: "Expiry line",
      type: "string",
      group: "body",
      validation: validateStepUpOtpSlots,
      initialValue: "This code expires in 15 minutes.",
    }),
    defineField({
      name: "closingLine",
      title: "Closing line",
      type: "string",
      group: "body",
      description: "Soft reassurance for anyone who did not request the code.",
      validation: validateStepUpOtpSlots,
      initialValue: "If you did not request this code, you can ignore this email.",
    }),
    defineField({
      name: "signoff",
      title: "Sign-off",
      type: "string",
      group: "body",
      validation: validateStepUpOtpSlots,
      initialValue: "Josephine",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Step-up code → Purchaser",
      subtitle:
        "Sent to a purchaser when they attempt a high-risk change to a gift (edit recipient, send now, claim for yourself). Code expires in 15 minutes, elevated session lasts 10 minutes.",
    }),
  },
});
