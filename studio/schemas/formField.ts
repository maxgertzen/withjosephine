import { defineField, defineType } from "sanity";
import { nameFollowupField, typographyField } from "./_shared/typographyField";

const ICON_KEYS = [
  { title: "None", value: "none" },
  { title: "Calendar", value: "calendar" },
  { title: "Clock", value: "clock" },
  { title: "Map pin", value: "map-pin" },
  { title: "Camera", value: "camera" },
  { title: "Bookmark", value: "bookmark" },
  { title: "Star", value: "star" },
];

const HELPER_POSITIONS = [
  { title: "After input (default)", value: "after" },
  { title: "Before input", value: "before" },
];

const PLACE_AUTOCOMPLETE_PROVIDERS = [
  { title: "GeoNames static (default)", value: "geonames-static" },
  { title: "Geoapify (Phase 2)", value: "geoapify" },
  { title: "None (plain text)", value: "none" },
];

export const formField = defineType({
  name: "formField",
  title: "Form Field",
  type: "document",
  fields: [
    defineField({
      name: "key",
      title: "Field Key",
      type: "string",
      description:
        "Canonical identifier used in form responses. Immutable after first save — pick carefully (e.g. fullName, birthDate, focusAreas).",
      readOnly: ({ document }) => document?._createdAt != null,
      validation: (rule) =>
        rule
          .required()
          .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
            name: "camelCaseKey",
            invert: false,
          })
          .error("Key must start with a letter and contain only letters, numbers, and underscores."),
    }),
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description: "Visible label shown to the user above the field.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "type",
      title: "Field Type",
      type: "string",
      description: "Determines the input rendered to the user and how the response is stored.",
      options: {
        list: [
          { title: "Short Text", value: "shortText" },
          { title: "Long Text", value: "longText" },
          { title: "Email", value: "email" },
          { title: "Date", value: "date" },
          { title: "Time", value: "time" },
          { title: "Select (single)", value: "select" },
          { title: "Multi-Select (exact count)", value: "multiSelectExact" },
          { title: "File Upload", value: "fileUpload" },
          { title: "Consent Checkbox", value: "consent" },
          { title: "Place Autocomplete", value: "placeAutocomplete" },
        ],
        layout: "dropdown",
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "placeholder",
      title: "Placeholder",
      type: "string",
      description: "Greyed-out hint text shown inside empty inputs.",
    }),
    defineField({
      name: "helpText",
      title: "Help Text",
      type: "text",
      rows: 2,
      description: "Secondary text shown beneath the input to guide the user.",
    }),
    defineField({
      name: "clarificationNote",
      title: "Clarification Note",
      type: "text",
      rows: 3,
      description:
        "Extra context shown alongside the field — typically italicised gold marginalia (e.g. ✦ note about birth time accuracy).",
    }),
    defineField({
      name: "helperPosition",
      title: "Helper Position",
      type: "string",
      description:
        "Where the helper text renders. Default 'after'. Use 'before' for fields that need context before the input (e.g. photo upload).",
      options: { list: HELPER_POSITIONS, layout: "radio" },
      initialValue: "after",
    }),
    defineField({
      name: "iconKey",
      title: "Icon",
      type: "string",
      description: "Optional decorative icon rendered with the field label.",
      options: { list: ICON_KEYS, layout: "dropdown" },
      initialValue: "none",
    }),
    defineField({
      name: "required",
      title: "Required",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "system",
      title: "System Field",
      type: "boolean",
      description:
        "System fields are part of core flow — only label/helpText editable. Custom fields are fully editable by Josephine.",
      initialValue: false,
    }),
    defineField({
      name: "appliesToServices",
      title: "Applies To Services",
      type: "array",
      description: "Limit this field to specific readings. Empty means it applies to all services.",
      of: [{ type: "reference", to: [{ type: "reading" }] }],
    }),
    defineField({
      name: "multiSelectCount",
      title: "Multi-Select Exact Count",
      type: "number",
      description: "Exact number of options the user must select.",
      hidden: ({ parent }) => parent?.type !== "multiSelectExact",
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { type?: string } | undefined;
          if (parent?.type !== "multiSelectExact") return true;
          if (typeof value !== "number") return "Required for multi-select fields.";
          if (value < 1) return "Must be at least 1.";
          if (value > 10) return "Must be 10 or fewer.";
          return true;
        }),
    }),
    defineField({
      name: "options",
      title: "Options",
      type: "array",
      description: "Choices shown to the user. Used by Select and Multi-Select fields.",
      hidden: ({ parent }) =>
        parent?.type !== "select" && parent?.type !== "multiSelectExact",
      of: [
        {
          type: "object",
          name: "fieldOption",
          fields: [
            defineField({
              name: "value",
              title: "Value",
              type: "string",
              description: "Stored in form responses. Stable identifier — avoid changing.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "label",
              title: "Label",
              type: "string",
              description: "Visible text shown to the user.",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "category",
              title: "Category",
              type: "string",
              description: "Optional grouping label (e.g. 'Relationships', 'Purpose'). Used for §4 question grouping.",
            }),
            defineField({
              name: "categoryOrder",
              title: "Category Order",
              type: "number",
              description: "Display order of the category this option belongs to.",
            }),
            nameFollowupField(),
          ],
          preview: {
            select: { title: "label", subtitle: "value" },
          },
        },
      ],
    }),
    defineField({
      name: "placeAutocompleteSource",
      title: "Place Autocomplete Source",
      type: "object",
      description: "Provider used to look up place names. Only relevant for Place Autocomplete fields.",
      hidden: ({ parent }) => parent?.type !== "placeAutocomplete",
      fields: [
        defineField({
          name: "provider",
          title: "Provider",
          type: "string",
          options: { list: PLACE_AUTOCOMPLETE_PROVIDERS, layout: "dropdown" },
          initialValue: "geonames-static",
        }),
      ],
    }),
    defineField({
      name: "fileUploadConfig",
      title: "File Upload Config",
      type: "object",
      description: "MIME types, size limit, and EXIF stripping for file upload fields.",
      hidden: ({ parent }) => parent?.type !== "fileUpload",
      fields: [
        defineField({
          name: "mimeTypes",
          title: "Accepted MIME Types",
          type: "array",
          of: [{ type: "string" }],
          initialValue: ["image/jpeg", "image/png", "image/webp"],
        }),
        defineField({
          name: "maxSizeMb",
          title: "Max Size (MB)",
          type: "number",
          initialValue: 8,
        }),
        defineField({
          name: "exifStrip",
          title: "Strip EXIF on Upload",
          type: "boolean",
          initialValue: true,
        }),
      ],
    }),
    nameFollowupField(),
    typographyField(
      "Optional per-field typography override. Leave fields blank to inherit from the page defaults.",
    ),
    defineField({
      name: "validation",
      title: "Validation Rules",
      type: "object",
      description: "Optional input validation. Only relevant for short/long text fields.",
      fields: [
        defineField({
          name: "minLength",
          title: "Minimum Length",
          type: "number",
        }),
        defineField({
          name: "maxLength",
          title: "Maximum Length",
          type: "number",
        }),
        defineField({
          name: "pattern",
          title: "Regex Pattern",
          type: "string",
          description: "JavaScript regex string. Leave blank for no pattern check.",
        }),
        defineField({
          name: "patternErrorMessage",
          title: "Pattern Error Message",
          type: "string",
          description: "Shown to the user when the regex pattern fails.",
        }),
      ],
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "Display Order",
      name: "order",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "label", subtitle: "type" },
  },
});
