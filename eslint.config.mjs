import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      ".open-next/**",
      ".wrangler/**",
      "storybook-static/**",
      "studio/**",
      "scripts/**",
      "playwright-report/**",
      "test-results/**",
      ".claude/worktrees/**",
    ],
  },
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.name=/^(requireEnv|optionalEnv)$/] > Literal.arguments:first-child[value=/^NEXT_PUBLIC_/]",
          message:
            "Don't read NEXT_PUBLIC_* via requireEnv()/optionalEnv() — use literal process.env.NEXT_PUBLIC_X access so Next's DefinePlugin can inline the build-time value into the bundle. See src/lib/env.ts header comment.",
        },
      ],
    },
  },
  prettierConfig,
];

export default eslintConfig;
