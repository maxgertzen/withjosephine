import { defineField, defineType, type CustomValidator } from "sanity";

import { PhotoR2Preview } from "../components/PhotoR2Preview";
import { prepareSubmissionPreview } from "./submissionPreview";

const requireWhenDeliveredAtSet =
  (errorMessage: string): CustomValidator<unknown> =>
  (value, context) => {
    const parent = context.parent as { deliveredAt?: string } | undefined;
    if (parent?.deliveredAt && !value) return errorMessage;
    return true;
  };

export const submission = defineType({
  name: "submission",
  title: "Submission",
  type: "document",
  fields: [
    defineField({
      name: "createdAt",
      title: "Submitted At",
      type: "datetime",
      readOnly: true,
      description: "When the customer submitted the intake form.",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      description: "Lifecycle state. Pending → Paid (via Stripe webhook) or Expired (via cleanup cron).",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Paid", value: "paid" },
          { title: "Expired", value: "expired" },
        ],
        layout: "radio",
      },
      initialValue: "pending",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "serviceRef",
      title: "Service",
      type: "reference",
      description: "Reading the user submitted this intake form for.",
      to: [{ type: "reading" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      description: "Client email captured at form submission.",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "responses",
      title: "Responses",
      type: "array",
      description: "Snapshot of every form field answer at submission time.",
      of: [
        {
          type: "object",
          name: "submissionResponse",
          fields: [
            defineField({
              name: "fieldKey",
              title: "Field Key",
              type: "string",
              description: "Canonical key from the form field at submission time.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "fieldLabelSnapshot",
              title: "Field Label (snapshot)",
              type: "string",
              description: "Label text as it appeared to the user when they submitted.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "fieldType",
              title: "Field Type",
              type: "string",
              description: "Type of the field at submission time (shortText, multiSelectExact, etc).",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "value",
              title: "Value",
              type: "text",
              description:
                "Submitted value. Multi-select answers are stored as a comma-joined string.",
            }),
          ],
          preview: {
            select: { title: "fieldLabelSnapshot", subtitle: "value" },
          },
        },
      ],
    }),
    defineField({
      name: "consentSnapshot",
      title: "Consent Snapshot",
      type: "object",
      description: "Frozen record of the consent terms the user agreed to at submission.",
      fields: [
        defineField({
          name: "labelText",
          title: "Consent Label Text",
          type: "text",
          description: "Exact wording the user saw and accepted.",
        }),
        defineField({
          name: "acknowledgedAt",
          title: "Acknowledged At",
          type: "datetime",
        }),
        defineField({
          name: "ipAddress",
          title: "IP Address",
          type: "string",
          description: "Client IP captured at consent — used for audit trail only.",
        }),
      ],
    }),
    defineField({
      name: "photoR2Key",
      title: "Photo R2 Key",
      type: "string",
      description: "R2 object key — not the URL.",
      components: { input: PhotoR2Preview },
    }),
    defineField({
      name: "stripeEventId",
      title: "Stripe Event ID",
      type: "string",
      description: "For webhook idempotency.",
    }),
    defineField({
      name: "stripeSessionId",
      title: "Stripe Session ID",
      type: "string",
      description: "Stripe Checkout Session ID associated with the paid event.",
    }),
    defineField({
      name: "paidAt",
      title: "Paid At",
      type: "datetime",
      description: "Set by the Stripe webhook handler when payment is confirmed.",
    }),
    defineField({
      name: "amountPaidCents",
      title: "Amount Paid (cents)",
      type: "number",
      description:
        "Actual amount Stripe collected (in smallest currency unit, e.g. cents for USD). Differs from list price when a coupon is redeemed.",
    }),
    defineField({
      name: "amountPaidCurrency",
      title: "Amount Paid Currency",
      type: "string",
      description: "ISO currency code Stripe returned (lowercase, e.g. \"usd\").",
    }),
    defineField({
      name: "expiredAt",
      title: "Expired At",
      type: "datetime",
      description: "Set by the cleanup cron when an unpaid submission ages out.",
    }),
    defineField({
      name: "voiceNote",
      title: "Voice Note",
      type: "file",
      description:
        "Drag the recorded voice note here (mp3 / m4a / wav). Required before you can mark this reading delivered.",
      options: { accept: "audio/*" },
      validation: (rule) =>
        rule.custom(requireWhenDeliveredAtSet("Upload the voice note before setting Delivered At.")),
    }),
    defineField({
      name: "readingPdf",
      title: "Reading PDF",
      type: "file",
      description:
        "Drag the supporting PDF here. Required before you can mark this reading delivered.",
      options: { accept: "application/pdf" },
      validation: (rule) =>
        rule.custom(requireWhenDeliveredAtSet("Upload the reading PDF before setting Delivered At.")),
    }),
    defineField({
      name: "deliveredAt",
      title: "Delivered At",
      type: "datetime",
      description:
        "Set this only after BOTH files (Voice Note + Reading PDF) are uploaded. The customer's Day +7 delivery email will fire at the next cron tick after this is set.",
      validation: (rule) =>
        rule.custom((value, context) => {
          if (!value) return true;
          const parent = context.parent as
            | { voiceNote?: unknown; readingPdf?: unknown }
            | undefined;
          if (!parent?.voiceNote || !parent?.readingPdf) {
            return "Upload Voice Note and Reading PDF before setting Delivered At.";
          }
          return true;
        }),
    }),
    defineField({
      name: "listenedAt",
      title: "Listened At",
      type: "datetime",
      description:
        "First time the customer hit play on the audio. Written by the audio proxy route on first 2xx Range response — first-write-wins. Read-only signal, do not edit.",
      readOnly: true,
    }),
    defineField({
      name: "emailsFired",
      title: "Emails Fired",
      type: "array",
      description: "Audit log of every transactional email sent for this submission.",
      of: [
        {
          type: "object",
          name: "emailFiredEntry",
          fields: [
            defineField({
              name: "type",
              title: "Type",
              type: "string",
              description:
                "Email kind. Mirrors the SPEC §15 Mixpanel email_sent type: one of order_confirmation, day2, day7, day14, abandonment.",
              options: {
                list: [
                  { title: "Order confirmation", value: "order_confirmation" },
                  { title: "Day +2 (I've started)", value: "day2" },
                  { title: "Day +7 (delivery)", value: "day7" },
                  { title: "Day +14 (post-delivery follow-up)", value: "day14" },
                  { title: "Abandonment recovery", value: "abandonment" },
                ],
                layout: "dropdown",
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "sentAt",
              title: "Sent At",
              type: "datetime",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "resendId",
              title: "Resend ID",
              type: "string",
              description: "Resend message ID for traceability.",
            }),
          ],
          preview: { select: { title: "type", subtitle: "sentAt" } },
        },
      ],
      initialValue: [],
    }),
  ],
  orderings: [
    {
      title: "Newest First",
      name: "createdAtDesc",
      by: [{ field: "createdAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      email: "email",
      status: "status",
      createdAt: "createdAt",
      paidAt: "paidAt",
      deliveredAt: "deliveredAt",
      listenedAt: "listenedAt",
      firstName: 'responses[fieldKey == "first_name"][0].value',
      lastName: 'responses[fieldKey == "last_name"][0].value',
    },
    prepare: prepareSubmissionPreview,
  },
});
