import { defineField, defineType } from "sanity";

export const submission = defineType({
  name: "submission",
  title: "Submission",
  type: "document",
  fields: [
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
      name: "clientReferenceId",
      title: "Client Reference ID",
      type: "string",
      description: "Sent to Stripe as client_reference_id.",
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "paidAt",
      title: "Paid At",
      type: "datetime",
      description: "Set by the Stripe webhook handler when payment is confirmed.",
    }),
    defineField({
      name: "expiredAt",
      title: "Expired At",
      type: "datetime",
      description: "Set by the cleanup cron when an unpaid submission ages out.",
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
    select: { title: "email", subtitle: "status", description: "createdAt" },
  },
});
