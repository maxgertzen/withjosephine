import path from "node:path";

import { defineCliConfig } from "sanity/cli";

// Narrow `@/…` resolution to the subtrees the Studio bundle is allowed to
// reach. The Studio is a PUBLIC bundle served on *.sanity.studio, so any
// module pulled here ships to that origin. Allowlisting prevents a future
// import from accidentally dragging a secret-reading module (e.g. resend
// client, env.ts, db modules) into the public surface.
//
// Add a new allowlist entry only after confirming the target subtree
// contains no env reads, no SDK clients, no server-only code.
const SRC = path.resolve(__dirname, "../src");
const STUDIO_STUBS = path.resolve(__dirname, "preview-stubs");
const STUDIO_SRC_ALIASES = [
  { find: /^next\/navigation$/, replacement: `${STUDIO_STUBS}/next-navigation.ts` },
  { find: /^next\/image$/, replacement: `${STUDIO_STUBS}/next-image.tsx` },
  { find: /^@\/data\//, replacement: `${SRC}/data/` },
  { find: /^@\/lib\/emails\//, replacement: `${SRC}/lib/emails/` },
  { find: /^@\/lib\/theme\//, replacement: `${SRC}/lib/theme/` },
  { find: /^@\/lib\/page-previews\//, replacement: `${SRC}/lib/page-previews/` },
  { find: /^@\/lib\/celestialPresets$/, replacement: `${SRC}/lib/celestialPresets.ts` },
  { find: /^@\/lib\/constants$/, replacement: `${SRC}/lib/constants.ts` },
  { find: /^@\/lib\/utils$/, replacement: `${SRC}/lib/utils.ts` },
  { find: /^@\/lib\/formStyles$/, replacement: `${SRC}/lib/formStyles.ts` },
  { find: /^@\/lib\/clarity$/, replacement: `${SRC}/lib/clarity.ts` },
  { find: /^@\/lib\/http\//, replacement: `${SRC}/lib/http/` },
  { find: /^@\/lib\/hooks\//, replacement: `${SRC}/lib/hooks/` },
  { find: /^@\/lib\/auth\/emailValidation$/, replacement: `${SRC}/lib/auth/emailValidation.ts` },
  { find: /^@\/lib\/sanity\/pickDefined$/, replacement: `${SRC}/lib/sanity/pickDefined.ts` },
  { find: /^@\/lib\/a11y\//, replacement: `${SRC}/lib/a11y/` },
  { find: /^@\/lib\/booking\/formatGiftSendAt$/, replacement: `${SRC}/lib/booking/formatGiftSendAt.ts` },
  { find: /^@\/lib\/booking\/constants$/, replacement: `${SRC}/lib/booking/constants.ts` },
  { find: /^@\/lib\/booking\/readingRetention$/, replacement: `${SRC}/lib/booking/readingRetention.ts` },
  { find: /^@\/lib\/booking\/giftStatus$/, replacement: `${SRC}/lib/booking/giftStatus.ts` },
  { find: /^@\/lib\/booking\/giftPersonas$/, replacement: `${SRC}/lib/booking/giftPersonas.ts` },
  { find: /^@\/lib\/booking\/scheduling\//, replacement: `${SRC}/lib/booking/scheduling/` },
  { find: /^@\/components\//, replacement: `${SRC}/components/` },
  { find: /^@\/app\/\(authed\)\/listen\//, replacement: `${SRC}/app/(authed)/listen/` },
  { find: /^@\/app\/\(authed\)\/my-readings\//, replacement: `${SRC}/app/(authed)/my-readings/` },
  { find: /^@\/app\/my-gifts\//, replacement: `${SRC}/app/my-gifts/` },
  { find: /^@\/app\/auth\//, replacement: `${SRC}/app/auth/` },
  { find: /^@\/lib\/auth\/safeNext$/, replacement: `${SRC}/lib/auth/safeNext.ts` },
];

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
      alias: [
        ...(Array.isArray(viteConfig.resolve?.alias) ? viteConfig.resolve.alias : []),
        ...STUDIO_SRC_ALIASES,
      ],
    },
  }),
});
