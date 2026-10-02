import { DocumentTextIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

import { isParagraph, notePath } from "@/lib/notes/notes";
import type { NoteBodyBlock } from "@/lib/notes/types";

import { NoteUrlInput } from "../components/NoteUrlInput";

export function firstBlockIsParagraph(body: unknown): true | string {
  return !Array.isArray(body) || body.length === 0 || isParagraph(body[0] as NoteBodyBlock)
    ? true
    : "Start with a paragraph. The first paragraph is the note's opening and its Google description.";
}

const linkAnnotation = defineArrayMember({
  name: "link",
  type: "object",
  title: "Link",
  fields: [
    defineField({
      name: "href",
      type: "url",
      title: "URL",
      description: "A page on this site (/book/soul-blueprint), a full web address, or mailto:hello@withjosephine.com",
      validation: (rule) => rule.uri({ scheme: ["http", "https", "mailto"], allowRelative: true }),
    }),
  ],
});

const noteLinkAnnotation = defineArrayMember({
  name: "noteLink",
  type: "object",
  title: "Link to a note",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "note",
      type: "reference",
      title: "Note",
      to: [{ type: "article" }],
      validation: (rule) => rule.required(),
    }),
  ],
});

export const article = defineType({
  name: "article",
  title: "Note",
  type: "document",
  icon: DocumentTextIcon,
  groups: [
    { name: "note", title: "Note", default: true },
    { name: "ending", title: "End of the note" },
    { name: "extras", title: "Search and audio" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "note",
      description: 'Says what the note is about in plain words. No "Josephine" and no "vs".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Web address",
      type: "slug",
      group: "note",
      description: "The end of the note's address. Changing it after publishing breaks shared links.",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
      components: { input: NoteUrlInput },
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      group: "note",
      description: "The line under the title. Also shown under the title on /notes.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      group: "note",
      description:
        "The first paragraph is the opening. Use Quote for the one line people would screenshot. Add images and Plates from the Insert menu.",
      of: [
        defineArrayMember({
          type: "block",
          styles: [
            { title: "Paragraph", value: "normal" },
            { title: "Heading", value: "h2" },
            { title: "Small heading", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Number", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Bold", value: "strong" },
              { title: "Italic", value: "em" },
            ],
            annotations: [linkAnnotation, noteLinkAnnotation],
          },
        }),
        defineArrayMember({
          type: "image",
          title: "Image",
          fields: [
            defineField({
              name: "alt",
              title: "Description for screen readers",
              type: "string",
              description: "What the image shows, in one sentence.",
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "caption", title: "Caption", type: "string" }),
          ],
        }),
        defineArrayMember({ type: "notePlate" }),
      ],
      validation: (rule) => [
        rule.required().min(1),
        rule.custom(firstBlockIsParagraph).warning(),
      ],
    }),
    defineField({
      name: "relatedReading",
      title: "Reading to offer at the end",
      type: "reference",
      group: "ending",
      to: [{ type: "reading" }],
      description:
        "The end of the note shows a box with this reading's name, price, its short line from the homepage, and a button to book it. This note is also listed on that reading's booking page.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "moreNotes",
      title: "Notes to suggest next",
      type: "array",
      group: "ending",
      description:
        'Up to two notes, listed under "More notes" at the very end. A "See all notes" link is added when there are more notes than these.',
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "article" }],
          options: {
            filter: ({ document }) => ({
              filter: "_id != $id",
              params: { id: document._id.replace(/^drafts\./, "") },
            }),
          },
        }),
      ],
      validation: (rule) => rule.max(2).unique(),
    }),
    defineField({
      name: "publishedAt",
      title: "First published",
      type: "datetime",
      group: "extras",
      description: "Orders the notes on /notes, newest first. Not shown on the page.",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "updatedAt",
      title: "Last updated",
      type: "datetime",
      group: "extras",
      description: 'Set this when you change a published note. The note shows "Updated" with this month and year, or the first published date when empty.',
    }),
    defineField({
      name: "searchDescription",
      title: "Google description",
      type: "text",
      rows: 3,
      group: "extras",
      description: "Empty uses the note's first paragraph.",
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: "audio",
      title: "Recording",
      type: "file",
      group: "extras",
      description: "Optional. A listen button appears under the author row when a recording is added.",
      options: { accept: "audio/*" },
    }),
    defineField({
      name: "audioMinutes",
      title: "Recording minutes",
      type: "number",
      group: "extras",
      description: "Shown next to the listen button.",
      validation: (rule) => rule.min(1).integer(),
    }),
  ],
  orderings: [
    {
      title: "Newest first",
      name: "publishedAtDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "slug.current" },
    prepare: ({ title, subtitle }) => ({
      title,
      subtitle: subtitle ? notePath(subtitle) : undefined,
    }),
  },
});
