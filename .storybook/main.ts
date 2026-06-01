import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/nextjs";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: ["@storybook/addon-mcp"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
  env: (env) => ({
    ...env,
    NEXT_PUBLIC_SANITY_PROJECT_ID:
      env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "storybook-mock-project",
    NEXT_PUBLIC_SANITY_DATASET: env.NEXT_PUBLIC_SANITY_DATASET ?? "storybook",
    NEXT_PUBLIC_R2_PUBLIC_HOST:
      env.NEXT_PUBLIC_R2_PUBLIC_HOST ?? "images.withjosephine.com",
  }),
  webpackFinal: async (webpack) => {
    webpack.resolve = webpack.resolve ?? {};
    const existingAlias = webpack.resolve.alias as
      | Record<string, string | false | string[]>
      | undefined;
    webpack.resolve.alias = {
      ...existingAlias,
      react: path.resolve(projectRoot, "node_modules/react"),
      "react-dom": path.resolve(projectRoot, "node_modules/react-dom"),
    };
    return webpack;
  },
};

export default config;
