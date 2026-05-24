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
const STUDIO_SRC_ALIASES = [
  { find: /^@\/data\//, replacement: `${SRC}/data/` },
  { find: /^@\/lib\/emails\//, replacement: `${SRC}/lib/emails/` },
  { find: /^@\/lib\/theme\//, replacement: `${SRC}/lib/theme/` },
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
