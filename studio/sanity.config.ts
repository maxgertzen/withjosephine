import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { colorInput } from "@sanity/color-input";
import { schemaTypes } from "./schemas";
import { deskStructure, SINGLETON_TYPES } from "./schemas/deskStructure";
import { presentationResolve } from "./presentation";

const previewOrigin =
  process.env.SANITY_STUDIO_PREVIEW_URL ?? "http://localhost:3000";

export default defineConfig({
  name: "josephine",
  title: "Josephine Soul Readings",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [
    presentationTool({
      resolve: presentationResolve,
      previewUrl: {
        initial: previewOrigin,
        previewMode: {
          enable: "/api/draft/enable",
        },
      },
    }),
    structureTool({ structure: deskStructure }),
    visionTool(),
    colorInput(),
  ],
  schema: { types: schemaTypes },
  document: {
    actions: (prev, { schemaType }) => {
      if (SINGLETON_TYPES.has(schemaType)) {
        return prev.filter(
          ({ action }) => action && ["publish", "discardChanges", "restore"].includes(action)
        );
      }
      return prev;
    },
    newDocumentOptions: (prev) =>
      prev.filter((item) => !SINGLETON_TYPES.has(item.templateId)),
  },
});
