import { createRequire } from "node:module";
import path from "node:path";

import type { StorybookConfig } from "@storybook/nextjs";

const require = createRequire(import.meta.url);

// Pin React + ReactDOM to the project's installed copy by resolving the actual
// package.json on disk (pnpm symlinks otherwise leave Storybook's transitive
// react-refresh loader pulling in a second React instance, which triggers
// "Cannot read properties of null (reading 'useMemo')" inside HeadManagerProvider).
const reactDir = path.dirname(require.resolve("react/package.json"));
const reactDomDir = path.dirname(require.resolve("react-dom/package.json"));

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
    webpack.resolve.symlinks = false;
    const existingAlias = webpack.resolve.alias as
      | Record<string, string | false | string[]>
      | undefined;
    webpack.resolve.alias = {
      ...existingAlias,
      react: reactDir,
      "react-dom": reactDomDir,
      "react/jsx-runtime": path.join(reactDir, "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.join(reactDir, "jsx-dev-runtime.js"),
      "react-dom/client": path.join(reactDomDir, "client.js"),
      "react-dom/server": path.join(reactDomDir, "server.js"),
    };
    return webpack;
  },
};

export default config;
