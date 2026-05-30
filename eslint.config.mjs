import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const EM_DASH_MESSAGE =
  "Em-dashes (U+2014) banned in customer copy per memory feedback_no_em_dashes. Substitute with commas, colons, parens, semicolons, sentence breaks, or a regular hyphen.";

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
  {
    files: [
      "src/data/**/*.{ts,tsx}",
      "src/app/{privacy,terms,refund-policy}/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\u2014/]",
          message: EM_DASH_MESSAGE,
        },
        {
          selector: "JSXText[value=/\\u2014/]",
          message: EM_DASH_MESSAGE,
        },
        {
          selector: "TemplateElement[value.raw=/\\u2014/]",
          message: EM_DASH_MESSAGE,
        },
      ],
    },
  },
  prettierConfig,
];

export default eslintConfig;
