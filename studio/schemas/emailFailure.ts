import { defineField, defineType } from "sanity";

import {
  EMAIL_TYPE_LABELS,
  FAILURE_KIND_LABELS,
  prepareEmailFailurePreview,
} from "./emailFailurePreview";

const asOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, title]) => ({ title, value }));

export const emailFailure = defineType({
  name: "emailFailure",
  title: "Failed send",
  type: "object",
  readOnly: true,
  fields: [
    defineField({
      name: "emailType",
      title: "Email",
      type: "string",
      options: { list: asOptions(EMAIL_TYPE_LABELS) },
    }),
    defineField({
      name: "kind",
      title: "What happened",
      type: "string",
      options: { list: asOptions(FAILURE_KIND_LABELS) },
    }),
    defineField({ name: "recipient", title: "Sent to", type: "string" }),
    defineField({ name: "attemptNumber", title: "Attempt", type: "number" }),
    defineField({ name: "attemptedAt", title: "Attempted at", type: "datetime" }),
    defineField({ name: "failedAt", title: "Failed at", type: "datetime" }),
    defineField({ name: "errorCode", title: "Error code", type: "string" }),
    defineField({ name: "statusCode", title: "Resend status code", type: "number" }),
    defineField({ name: "errorMessage", title: "Error message", type: "text", rows: 2 }),
    defineField({ name: "bounceType", title: "Bounce type", type: "string" }),
    defineField({ name: "resendId", title: "Resend email id", type: "string" }),
    defineField({ name: "resolvedAt", title: "Sent since", type: "datetime" }),
  ],
  preview: {
    select: {
      emailType: "emailType",
      kind: "kind",
      errorCode: "errorCode",
      recipient: "recipient",
      attemptNumber: "attemptNumber",
      failedAt: "failedAt",
      resolvedAt: "resolvedAt",
    },
    prepare: prepareEmailFailurePreview,
  },
});
