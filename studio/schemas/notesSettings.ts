import { defineField, defineType } from "sanity";

import { NOTES_DEFAULTS, type NotesContent } from "../../src/data/defaults";

type NotesTextField = { name: keyof NotesContent; title: string; description: string };

const TEXT_FIELDS: NotesTextField[] = [
  { name: "indexTitle", title: "Notes page title", description: "The heading of /notes." },
  { name: "indexSubtitle", title: "Notes page subtitle", description: "The line under the heading of /notes." },
  {
    name: "indexSearchDescription",
    title: "Notes page search description",
    description: "The description Google and link previews show for /notes.",
  },
  { name: "navLinkLabel", title: "Menu link", description: "The Notes item in the top menu." },
  {
    name: "readingTimeTemplate",
    title: "Reading time",
    description: "Shown under each note on /notes. {minutes} becomes the number.",
  },
  { name: "backLabel", title: "Back link", description: "The link above a note's title that goes back to /notes." },
  { name: "authorName", title: "Author name", description: "First line next to the portrait." },
  { name: "authorLine", title: "Author line", description: "Second line next to the portrait." },
  { name: "listenLabel", title: "Listen button", description: "Shown only on notes that have a recording." },
  {
    name: "listenLengthTemplate",
    title: "Recording length",
    description: "Next to the listen button. {minutes} becomes the note's recording minutes.",
  },
  { name: "signOff", title: "Sign-off", description: "The line at the end of every note." },
  {
    name: "updatedTemplate",
    title: "Updated line",
    description: "Under the sign-off. {date} becomes the month and year.",
  },
  {
    name: "cardLeadIn",
    title: "Line above the reading box",
    description: "Shown above the box at the end of every note that offers a reading.",
  },
  {
    name: "cardButton",
    title: "Reading box button",
    description: "The button in the box at the end of every note.",
  },
  { name: "moreNotesLabel", title: "More notes label", description: "Above the two notes listed at the end of a note." },
  {
    name: "seeAllLabel",
    title: "See all notes link",
    description: "Shown under More notes when there are more notes than the two listed.",
  },
  { name: "footerLinkLabel", title: "Footer link", description: "The link to /notes in the footer." },
  {
    name: "faqLinkTemplate",
    title: "FAQ link",
    description: "Under an FAQ answer that has a note picked. {title} becomes the note's title.",
  },
  {
    name: "readingPageTitle",
    title: "Reading page heading",
    description: "Above the list of notes on a reading's booking page.",
  },
];

export const notesSettings = defineType({
  name: "notesSettings",
  title: "Notes Settings",
  type: "document",
  groups: [
    { name: "visibility", title: "Visibility", default: true },
    { name: "words", title: "Words" },
  ],
  fields: [
    defineField({
      name: "enabled",
      title: "Show Notes on the site",
      type: "boolean",
      group: "visibility",
      description:
        "Notes appear on the site (the /notes page, footer link, FAQ links, reading pages and sitemap) only when this is on and at least one note is published.",
      initialValue: false,
    }),
    defineField({
      name: "authorPhoto",
      title: "Author photo",
      type: "image",
      group: "visibility",
      description: "The portrait next to \"Written by\". Empty uses the About portrait from the Landing Page.",
    }),
    defineField({
      name: "hideAuthorPhoto",
      title: "Hide the author photo",
      type: "boolean",
      group: "visibility",
      description: "Leaves out the portrait next to \"Written by\" on every note. The name and line stay.",
      initialValue: false,
    }),
    defineField({
      name: "indexIllustration",
      title: "Notes page drawing",
      type: "image",
      group: "visibility",
      description:
        "The drawing between the list of notes and the footer on /notes. Empty uses the gold quill and stars.",
    }),
    ...TEXT_FIELDS.map((field) =>
      defineField({
        name: field.name,
        title: field.title,
        type: "string",
        group: "words",
        description: NOTES_DEFAULTS[field.name]
          ? `${field.description} Empty shows "${NOTES_DEFAULTS[field.name]}".`
          : `${field.description} Empty shows nothing.`,
        placeholder: NOTES_DEFAULTS[field.name] || undefined,
      }),
    ),
  ],
  preview: {
    prepare: () => ({ title: "Notes Settings" }),
  },
});
