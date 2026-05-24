import path from "node:path";

import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
    dataset: process.env.SANITY_STUDIO_DATASET || "production",
  },
  // Pinned so `sanity deploy` runs non-interactively.
  // Hostname: withjosephine.sanity.studio
  deployment: {
    appId: "tbbi4qmthmwx66i25e75wy86",
  },
  vite: (viteConfig) => ({
    ...viteConfig,
    resolve: {
      ...viteConfig.resolve,
      alias: {
        ...(viteConfig.resolve?.alias ?? {}),
        "@": path.resolve(__dirname, "../src"),
      },
    },
  }),
});
