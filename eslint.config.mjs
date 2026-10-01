import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const EM_DASH_MESSAGE =
  "Em-dashes (U+2014) banned in customer copy per memory feedback_no_em_dashes. Substitute with commas, colons, parens, semicolons, sentence breaks, or a regular hyphen.";

const OLD_GOLD_TEXT_MESSAGE =
  "#C4A46B fails WCAG text contrast on light surfaces. Use text-j-text-gold (small text) or text-j-text-gold-lg (24px and up) on cream and ivory, text-j-text-muted-warm on warm surfaces, and j-ornament for decorative icons and glyphs. In emails use text-muted-warm.";

const OLD_GOLD_TEXT_PATTERNS = [
  "/(?:text|outline|ring|decoration)-j-(?:accent|gold)(?:-light)?(?![\\w-])/",
  "/(?:text|outline|ring|decoration)-\\[[^\\]]*(?:c4a46b|j-accent|j-gold)/i",
  "/(?<![\\w-])text-gold(?![\\w-])/",
  "/color:\\s*['\"]?(?:#c4a46b|var\\(--(?:color-)?j-(?:accent|gold)\\b)/i",
];

const OLD_GOLD_TEXT_RULES = [
  ...OLD_GOLD_TEXT_PATTERNS.flatMap((pattern) => [
    { selector: `Literal[value=${pattern}]`, message: OLD_GOLD_TEXT_MESSAGE },
    { selector: `TemplateElement[value.raw=${pattern}]`, message: OLD_GOLD_TEXT_MESSAGE },
  ]),
  {
    selector:
      'Property[key.name="color"] > Literal[value=/^(?:#c4a46b|var\\(--(?:color-)?j-(?:accent|gold)\\b)/i]',
    message: OLD_GOLD_TEXT_MESSAGE,
  },
];

const BASE_RESTRICTED_SYNTAX = [
  {
    selector:
      "CallExpression[callee.name=/^(requireEnv|optionalEnv)$/] > Literal.arguments:first-child[value=/^NEXT_PUBLIC_/]",
    message:
      "Don't read NEXT_PUBLIC_* via requireEnv()/optionalEnv() — use literal process.env.NEXT_PUBLIC_X access so Next's DefinePlugin can inline the build-time value into the bundle. See src/lib/env.ts header comment.",
  },
  ...OLD_GOLD_TEXT_RULES,
];

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
      "MEMORY/**",
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
      "no-restricted-syntax": ["error", ...BASE_RESTRICTED_SYNTAX],
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
        ...BASE_RESTRICTED_SYNTAX,
      ],
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  prettierConfig,
];

export default eslintConfig;
