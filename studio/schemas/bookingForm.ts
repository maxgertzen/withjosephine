import { defineField, defineType } from "sanity";

export const bookingForm = defineType({
  name: "bookingForm",
  title: "Booking Form",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Page Title",
      type: "string",
      description: "Heading shown at the top of the intake form page.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Intro Copy",
      type: "text",
      rows: 4,
      description: "Welcome paragraph displayed above the first form section.",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      description: "Secondary descriptive copy shown beneath the intro.",
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      description: "Sections rendered in order. Each section contains its own fields.",
      of: [{ type: "reference", to: [{ type: "formSection" }] }],
    }),
    defineField({
      name: "confirmationMessage",
      title: "Confirmation Message",
      type: "text",
      rows: 4,
      description: "Message shown to the user after a successful submission.",
    }),
    defineField({
      name: "nonRefundableNotice",
      title: "Non-Refundable Notice",
      type: "text",
      rows: 3,
      description: "No-refund disclosure displayed directly above the consent checkbox.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "title" },
  },
});
