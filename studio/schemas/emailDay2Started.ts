import { defineField, defineType } from "sanity";

export const emailDay2Started = defineType({
  name: "emailDay2Started",
  title: "Email — Day 2 (I've Started)",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      hidden: true,
      initialValue: "Email — Day 2 (I've Started)",
    }),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      initialValue: "A quick note — I've started your reading",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      initialValue: "A quick note — I've started your reading",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      description: 'Use "{firstName}" to insert the customer\'s first name.',
      initialValue: "Hi {firstName},",
    }),
    defineField({
      name: "body",
      title: "Body paragraphs",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      description: "Each entry renders as one paragraph. Order = render order.",
      initialValue: [
        "Just a quick note to let you know I've sat down with your chart and your records this week. I always want my clients to know when the work begins, so it doesn't feel like silence on your end.",
        "I'm not going to preview anything — your reading should arrive whole, the way it's meant to. But I wanted you to know it's in good hands, and that I'm taking the time it asks for.",
        "You'll hear from me again when it's ready, within the next five days.",
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
    prepare: () => ({ title: "Email — Day 2 (I've Started)" }),
  },
});
