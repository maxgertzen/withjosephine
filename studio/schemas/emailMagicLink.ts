import { defineField, defineType } from "sanity";

export const emailMagicLink = defineType({
  name: "emailMagicLink",
  title: "Email — Magic Link",
  type: "document",
  fields: [
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "preview",
      title: "Preview text",
      type: "string",
      description: "Inbox preview snippet — displayed under subject in most clients.",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      initialValue: "Hi,",
    }),
    defineField({
      name: "body",
      title: "Body paragraphs",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      description: "Each entry is a paragraph in the body. Order = render order.",
      initialValue: [
        "Here's a fresh link to open your reading. It'll sign you in for the next seven days, so you can come back to the voice note and the PDF without asking again.",
        "This link expires in twenty-four hours. If you didn't ask for it, it's safe to ignore — nothing happens until someone clicks.",
      ],
    }),
    defineField({
      name: "signOff",
      title: "Sign-off line",
      type: "string",
      description: 'Optional — leave blank to use the default "With love, Josephine ✦".',
    }),
  ],
  preview: {
    prepare: () => ({ title: "Email — Magic Link" }),
  },
});
