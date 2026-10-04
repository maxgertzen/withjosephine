import { defineField, defineType } from "sanity";

import { buildGiftRecordPreview } from "./giftRecordPreview";

export const giftRecord = defineType({
  name: "giftRecord",
  title: "Gift",
  type: "document",
  readOnly: true,
  description: "A paid gift. Copied from the site, read-only.",
  fields: [
    defineField({ name: "reading", title: "Reading", type: "reference", to: [{ type: "reading" }] }),
    defineField({ name: "buyerFirstName", title: "From", type: "string" }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Not opened", value: "active" },
          { title: "Opened", value: "redeemed" },
          { title: "Cancelled", value: "cancelled" },
        ],
      },
    }),
    defineField({ name: "createdAt", title: "Created", type: "datetime" }),
    defineField({ name: "paidAt", title: "Bought", type: "datetime" }),
    defineField({ name: "sentAt", title: "Sent by email", type: "datetime" }),
    defineField({ name: "resendUsed", title: "Second email used", type: "boolean" }),
    defineField({ name: "openedAt", title: "Opened", type: "datetime" }),
    defineField({
      name: "hasNote",
      title: "Note waiting",
      type: "boolean",
      description: "The buyer's note is deleted when the gift is opened.",
    }),
    defineField({
      name: "submission",
      title: "Booking",
      type: "reference",
      to: [{ type: "submission" }],
      weak: true,
    }),
  ],
  orderings: [
    {
      title: "Newest First",
      name: "paidAtDesc",
      by: [{ field: "paidAt", direction: "desc" }],
    },
  ],
  preview: {
    select: {
      readingName: "reading.name",
      buyerFirstName: "buyerFirstName",
      status: "status",
      sentAt: "sentAt",
      paidAt: "paidAt",
    },
    prepare: buildGiftRecordPreview,
  },
});
