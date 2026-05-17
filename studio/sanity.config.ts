import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { colorInput } from "@sanity/color-input";
import { deleteCustomerDataAction } from "./actions/deleteCustomerData";
import { regenerateGiftClaimAction } from "./actions/regenerateGiftClaim";
import { schemaTypes } from "./schemas";
import { deskStructure, SINGLETON_TYPES } from "./schemas/deskStructure";
import { presentationResolve } from "./presentation";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!;

const sharedPlugins = (previewOrigin: string) => [
  presentationTool({
    resolve: presentationResolve,
    previewUrl: {
      initial: previewOrigin,
      previewMode: { enable: "/api/draft/enable" },
    },
  }),
  structureTool({ structure: deskStructure }),
  visionTool(),
  colorInput(),
];

export default defineConfig([
  {
    name: "production",
    title: "Production",
    subtitle: "withjosephine.com",
    projectId,
    dataset: "production",
    basePath: "/production",
    plugins: sharedPlugins("https://withjosephine.com"),
    schema: { types: schemaTypes },
    document: {
      actions: (prev, { schemaType }) => {
        if (SINGLETON_TYPES.has(schemaType)) {
          return prev.filter(
            ({ action }) => action && ["publish", "discardChanges", "restore"].includes(action),
          );
        }
        if (schemaType === "submission") {
          return [...prev, deleteCustomerDataAction, regenerateGiftClaimAction];
        }
        return prev;
      },
      newDocumentOptions: (prev) => prev.filter((item) => !SINGLETON_TYPES.has(item.templateId)),
    },
  },
  {
    name: "staging",
    title: "Staging",
    subtitle: "staging.withjosephine.com",
    projectId,
    dataset: "staging",
    basePath: "/staging",
    plugins: sharedPlugins("https://staging.withjosephine.com"),
    schema: { types: schemaTypes },
    document: {
      actions: (prev, { schemaType }) => {
        if (SINGLETON_TYPES.has(schemaType)) {
          return prev.filter(
            ({ action }) => action && ["publish", "discardChanges", "restore"].includes(action),
          );
        }
        if (schemaType === "submission") {
          return [...prev, deleteCustomerDataAction, regenerateGiftClaimAction];
        }
        return prev;
      },
      newDocumentOptions: (prev) => prev.filter((item) => !SINGLETON_TYPES.has(item.templateId)),
    },
  },
]);
