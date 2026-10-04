import { defineField, defineType, type CustomValidator } from "sanity";

import { DeliveryPanel } from "../components/DeliveryPanel/DeliveryPanel";
import { IntakeAnswersInput } from "../components/IntakeAnswers/IntakeAnswersInput";
import { PdfThumbnailGenerator } from "../components/PdfThumbnailGenerator";
import { PhotoR2Preview } from "../components/PhotoR2Preview";
import { emailFailure } from "./emailFailure";
import { prepareSubmissionPreview } from "./submissionPreview";

const requireOnceDelivered =
  (errorMessage: string): CustomValidator<unknown> =>
  (value, context) => {
    const parent = context.parent as { deliveredAt?: string } | undefined;
    if (parent?.deliveredAt && !value) return errorMessage;
    return true;
  };

const consentRecord = (name: string, title: string, description: string) =>
  defineField({
    name,
    title,
    type: "object",
    description,
    fields: [
      defineField({
        name: "labelText",
        title: "Wording",
        type: "text",
        description: "The exact wording the customer saw.",
      }),
      defineField({ name: "acknowledgedAt", title: "Agreed at", type: "datetime" }),
    ],
  });

export const submission = defineType({
  name: "submission",
  title: "Submission",
  type: "document",
  groups: [
    { name: "reading", title: "Reading", default: true },
    { name: "emails", title: "Emails" },
    { name: "payment", title: "Payment" },
    { name: "records", title: "Records" },
  ],
  fieldsets: [
    { name: "order", title: "Order", options: { columns: 2 } },
    { name: "files", title: "Reading files" },
    { name: "afterDelivery", title: "After delivery", options: { columns: 3 } },
  ],
  fields: [
    defineField({
      name: "serviceRef",
      title: "Reading",
      type: "reference",
      to: [{ type: "reading" }],
      readOnly: true,
      group: "reading",
      fieldset: "order",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      readOnly: true,
      group: "reading",
      fieldset: "order",
      description: "To change it, use Resend an email in the Delivery box and type the new address.",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      readOnly: true,
      group: "reading",
      fieldset: "order",
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
      name: "createdAt",
      title: "Submitted",
      type: "datetime",
      readOnly: true,
      group: "reading",
      fieldset: "order",
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: "paidAt",
      title: "Paid",
      type: "datetime",
      readOnly: true,
      group: "reading",
      fieldset: "order",
    }),
    defineField({
      name: "responses",
      title: "Intake answers",
      type: "array",
      readOnly: true,
      group: "reading",
      description: "The customer's answers, as they submitted them.",
      components: { input: IntakeAnswersInput },
      of: [
        {
          type: "object",
          name: "submissionResponse",
          fields: [
            defineField({
              name: "fieldKey",
              title: "Field key",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "fieldLabelSnapshot",
              title: "Question",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "fieldType",
              title: "Field type",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "value", title: "Answer", type: "text" }),
          ],
          preview: {
            select: { title: "fieldLabelSnapshot", subtitle: "value" },
          },
        },
      ],
    }),
    defineField({
      name: "photoR2Key",
      title: "Photo",
      type: "string",
      readOnly: true,
      group: "reading",
      description: "The photo the customer uploaded with the form.",
      components: { input: PhotoR2Preview },
    }),
    defineField({
      name: "voiceNote",
      title: "Voice note",
      type: "file",
      group: "reading",
      fieldset: "files",
      description: "The recorded voice note (mp3, m4a or wav). Needed before the reading can be sent.",
      options: { accept: "audio/*" },
      validation: (rule) =>
        rule.custom(requireOnceDelivered("This reading was sent with a voice note. Upload it again.")),
    }),
    defineField({
      name: "readingPdf",
      title: "Reading PDF",
      type: "file",
      group: "reading",
      fieldset: "files",
      description:
        "The reading PDF. Needed before the reading can be sent. The thumbnail below is made from its first page.",
      options: { accept: "application/pdf" },
      components: { input: PdfThumbnailGenerator },
      validation: (rule) =>
        rule.custom(requireOnceDelivered("This reading was sent with a PDF. Upload it again.")),
    }),
    defineField({
      name: "pdfThumbnail",
      title: "PDF thumbnail",
      type: "image",
      readOnly: true,
      group: "reading",
      fieldset: "files",
      description: "Made from the PDF's first page. Shown on the customer's listen page.",
    }),
    defineField({
      name: "delivery",
      title: "Delivery",
      type: "string",
      readOnly: true,
      group: "reading",
      hidden: ({ document }) => document?.status !== "paid",
      components: { input: DeliveryPanel },
    }),
    defineField({
      name: "deliveredAt",
      title: "Delivered",
      type: "datetime",
      readOnly: true,
      group: "reading",
      fieldset: "afterDelivery",
      description: "When the delivery email was sent.",
    }),
    defineField({
      name: "listenedAt",
      title: "First listened",
      type: "datetime",
      readOnly: true,
      group: "reading",
      fieldset: "afterDelivery",
      description: "When the customer first played the voice note.",
    }),
    defineField({
      name: "pdfDownloadedAt",
      title: "PDF first downloaded",
      type: "datetime",
      readOnly: true,
      group: "reading",
      fieldset: "afterDelivery",
      description: "When the customer first downloaded the PDF.",
    }),
    defineField({
      name: "pdfThumbnailSourceRef",
      title: "PDF thumbnail source (internal)",
      type: "string",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "deliveryRequestedAt",
      title: "Delivery requested at (internal)",
      type: "datetime",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "deliveryFailedAt",
      title: "Delivery failed at (internal)",
      type: "datetime",
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: "emailResendRequest",
      title: "Email resend request (internal)",
      type: "object",
      hidden: true,
      readOnly: true,
      fields: [
        defineField({ name: "emailType", title: "Email", type: "string" }),
        defineField({ name: "correctedEmail", title: "Send to", type: "string" }),
        defineField({ name: "requestedAt", title: "Requested at", type: "datetime" }),
      ],
    }),
    defineField({
      name: "emailFailures",
      title: "Failed sends",
      type: "array",
      readOnly: true,
      group: "emails",
      hidden: ({ value }) => !Array.isArray(value) || value.length === 0,
      description:
        "Customer emails that did not go out, including ones sent since. To resend, use the Delivery box on the Reading tab.",
      of: [{ type: emailFailure.name }],
    }),
    defineField({
      name: "emailsFired",
      title: "Emails sent",
      type: "array",
      readOnly: true,
      group: "emails",
      description: "Every email sent for this order.",
      of: [
        {
          type: "object",
          name: "emailFiredEntry",
          fields: [
            defineField({
              name: "type",
              title: "Email",
              type: "string",
              options: {
                list: [
                  { title: "Order confirmation", value: "order_confirmation" },
                  { title: "Gift confirmation (recipient)", value: "gift_recipient_confirmation" },
                  { title: "Reading delivery", value: "reading_delivery" },
                  { title: "Reading overdue alert (Josephine)", value: "reading_overdue_alert" },
                  { title: "Day +14 (post-delivery follow-up)", value: "day14" },
                  { title: "Abandonment recovery", value: "abandonment" },
                ],
                layout: "dropdown",
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "sentAt",
              title: "Sent at",
              type: "datetime",
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "resendId", title: "Resend email id", type: "string" }),
          ],
          preview: { select: { title: "type", subtitle: "sentAt" } },
        },
      ],
      initialValue: [],
    }),
    defineField({
      name: "gift",
      title: "Gift",
      type: "object",
      readOnly: true,
      group: "payment",
      hidden: ({ document }) => !document?.gift,
      description: "Paid by a gift code. Set by the site.",
      fields: [
        defineField({ name: "buyerFirstName", title: "Given by", type: "string" }),
        defineField({
          name: "giftRecord",
          title: "Gift record",
          type: "reference",
          to: [{ type: "giftRecord" }],
          weak: true,
        }),
      ],
    }),
    defineField({
      name: "amountPaidCents",
      title: "Amount paid (cents)",
      type: "number",
      readOnly: true,
      group: "payment",
      description: "What Stripe charged, in cents. Lower than the list price when a coupon was used.",
    }),
    defineField({
      name: "amountPaidCurrency",
      title: "Currency",
      type: "string",
      readOnly: true,
      group: "payment",
    }),
    defineField({
      name: "stripeSessionId",
      title: "Stripe session",
      type: "string",
      readOnly: true,
      group: "payment",
    }),
    defineField({
      name: "stripeEventId",
      title: "Stripe event",
      type: "string",
      readOnly: true,
      group: "payment",
    }),
    defineField({
      name: "expiredAt",
      title: "Expired",
      type: "datetime",
      readOnly: true,
      group: "payment",
      description: "When an unpaid order expired.",
    }),
    defineField({
      name: "consentSnapshot",
      title: "Consent capture",
      type: "object",
      readOnly: true,
      group: "records",
      description: "What the customer agreed to at booking. Kept for the legal record.",
      fields: [
        consentRecord(
          "art6Consent",
          "Art. 6 Consent (ordinary processing)",
          "Processing of name, email, birth data, photo and intake answers.",
        ),
        consentRecord(
          "art9Consent",
          "Art. 9 Consent (special-category, explicit)",
          "Birth chart and intake answers may reveal spiritual or philosophical beliefs.",
        ),
        consentRecord(
          "coolingOffConsent",
          "Cooling-Off Waiver (EU CRD Art. 16(m))",
          "Agreement to start the reading within the cooling-off period.",
        ),
        defineField({
          name: "labelText",
          title: "Legacy consent wording",
          type: "text",
          description: "Single-checkbox wording on orders from before the three checkboxes.",
        }),
        defineField({
          name: "acknowledgedAt",
          title: "Legacy agreed at",
          type: "datetime",
        }),
        defineField({
          name: "ipAddress",
          title: "IP address",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "recipientUserId",
      title: "Customer record id",
      type: "string",
      readOnly: true,
      group: "records",
      description: "Links this order to the customer's sign-in. Set by the site.",
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
      responses: "responses",
      giftBuyerFirstName: "gift.buyerFirstName",
    },
    prepare: prepareSubmissionPreview,
  },
});
