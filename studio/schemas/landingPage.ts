import { defineField, defineType } from "sanity";

export const landingPage = defineType({
  name: "landingPage",
  title: "Landing Page",
  type: "document",
  fields: [
    defineField({
      name: "hero",
      title: "Hero Section",
      type: "object",
      fields: [
        defineField({ name: "tagline", title: "Tagline", type: "string", description: 'e.g. "Astrologer + Akashic Record Reader"' }),
        defineField({ name: "introGreeting", title: "Intro Greeting", type: "string", description: "e.g. \"Hi, I'm Josephine.\"" }),
        defineField({ name: "introBody", title: "Intro Body", type: "text", rows: 4 }),
        defineField({ name: "ctaText", title: "CTA Button Text", type: "string", initialValue: "Explore Readings" }),
      ],
    }),
    defineField({
      name: "about",
      title: "About Section",
      type: "object",
      fields: [
        defineField({ name: "sectionTag", title: "Section Tag", type: "string", initialValue: "✦ About" }),
        defineField({ name: "heading", title: "Heading", type: "string", initialValue: "who i am + what this is" }),
        defineField({ name: "image", title: "Image", type: "image" }),
        defineField({
          name: "paragraphs",
          title: "Paragraphs",
          type: "array",
          of: [{ type: "text", rows: 3 }],
        }),
        defineField({ name: "signoff", title: "Sign-off Name", type: "string", initialValue: "Josephine" }),
      ],
    }),
    defineField({
      name: "howItWorks",
      title: "How It Works Section",
      type: "object",
      fields: [
        defineField({ name: "sectionTag", title: "Section Tag", type: "string", initialValue: "✦ Process" }),
        defineField({ name: "heading", title: "Heading", type: "string", initialValue: "how it works" }),
        defineField({
          name: "steps",
          title: "Steps",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                defineField({ name: "title", title: "Title", type: "string" }),
                defineField({ name: "description", title: "Description", type: "text", rows: 2 }),
              ],
              preview: { select: { title: "title" } },
            },
          ],
        }),
      ],
    }),
    defineField({
      name: "readingsSection",
      title: "Readings Section",
      type: "object",
      fields: [
        defineField({ name: "sectionTag", title: "Section Tag", type: "string", initialValue: "✦ Offerings" }),
        defineField({ name: "heading", title: "Heading", type: "string", initialValue: "readings" }),
        defineField({ name: "subheading", title: "Subheading", type: "string" }),
      ],
    }),
    defineField({
      name: "testimonialsSection",
      title: "Testimonials Section",
      type: "object",
      fields: [
        defineField({ name: "sectionTag", title: "Section Tag", type: "string", initialValue: "✦ Kind Words" }),
        defineField({ name: "heading", title: "Heading", type: "string", initialValue: "what others have said" }),
      ],
    }),
    defineField({
      name: "contactSection",
      title: "Contact Section",
      type: "object",
      fields: [
        defineField({ name: "sectionTag", title: "Section Tag", type: "string", initialValue: "✦ Get in Touch" }),
        defineField({ name: "heading", title: "Heading", type: "string", initialValue: "i'd love to hear from you" }),
        defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
        defineField({ name: "submitText", title: "Submit Button Text", type: "string", initialValue: "Send Message" }),
      ],
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "metaTitle", title: "Meta Title", type: "string" }),
        defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2 }),
        defineField({ name: "ogImage", title: "OG Image", type: "image" }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Landing Page" }),
  },
});
