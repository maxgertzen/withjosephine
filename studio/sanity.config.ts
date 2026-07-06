import type { DocumentActionsResolver, NewDocumentOptionsResolver } from "sanity";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { presentationTool } from "sanity/presentation";
import { visionTool } from "@sanity/vision";
import { colorInput } from "@sanity/color-input";
import { deleteCustomerDataAction } from "./actions/deleteCustomerData";
import { resendCustomerEmailAction } from "./actions/resendCustomerEmail";
import { sendEmailPreviewAction } from "./actions/sendEmailPreview";
import { EmailDescriptionBanner } from "./components/EmailDescriptionBanner";
import { schemaTypes } from "./schemas";
import {
  deskStructure,
  EMAIL_PREVIEW_SINGLETON_TYPES,
  SINGLETON_TYPES,
} from "./schemas/deskStructure";
import { presentationResolve } from "./presentation";

const projectId = process.env.SANITY_STUDIO_PROJECT_ID!;

const sharedPlugins = (previewOrigin: string) => [
  presentationTool({
    resolve: presentationResolve,
    previewUrl: {
      initial: `${previewOrigin}/preview`,
      previewMode: { enable: "/api/draft/enable" },
    },
  }),
  structureTool({ structure: deskStructure }),
  visionTool(),
  colorInput(),
];

const sharedActions: DocumentActionsResolver = (prev, { schemaType }) => {
  if (SINGLETON_TYPES.has(schemaType)) {
    const base = prev.filter(
      ({ action }) => action && ["publish", "discardChanges", "restore"].includes(action),
    );
    if (EMAIL_PREVIEW_SINGLETON_TYPES.has(schemaType)) {
      return [...base, sendEmailPreviewAction];
    }
    return base;
  }
  if (schemaType === "submission") {
    return [
      ...prev,
      deleteCustomerDataAction,
      resendCustomerEmailAction,
    ];
  }
  return prev;
};

const sharedNewDocumentOptions: NewDocumentOptionsResolver = (prev) =>
  prev.filter((item) => !SINGLETON_TYPES.has(item.templateId));

const sharedDocument = {
  actions: sharedActions,
  newDocumentOptions: sharedNewDocumentOptions,
};

const sharedForm = {
  components: {
    input: EmailDescriptionBanner,
  },
};

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
    form: sharedForm,
    document: sharedDocument,
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
    form: sharedForm,
    document: sharedDocument,
  },
]);
