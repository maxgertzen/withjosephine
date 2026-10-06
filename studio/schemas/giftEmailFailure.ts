import { defineField, defineType } from "sanity";

import { asOptions } from "./emailFailure";
import { FAILURE_KIND_LABELS } from "./emailFailurePreview";
import {
  GIFT_EMAIL_TYPE_LABELS,
  GIFT_RECIPIENT_LABELS,
  prepareGiftEmailFailurePreview,
} from "./giftEmailFailurePreview";

export const giftEmailFailure = defineType({
  name: "giftEmailFailure",
  title: "Failed gift email",
  type: "object",
  readOnly: true,
  fields: [
    defineField({
      name: "emailType",
      title: "Email",
      type: "string",
      options: { list: asOptions(GIFT_EMAIL_TYPE_LABELS) },
    }),
    defineField({
      name: "kind",
      title: "What happened",
      type: "string",
      options: { list: asOptions(FAILURE_KIND_LABELS) },
    }),
    defineField({
      name: "recipient",
      title: "Sent to",
      type: "string",
      options: { list: asOptions(GIFT_RECIPIENT_LABELS) },
    }),
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
    prepare: prepareGiftEmailFailurePreview,
  },
});
