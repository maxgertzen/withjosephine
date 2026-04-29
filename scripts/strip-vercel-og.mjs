// Post-build cleanup: replace `@vercel/og` import paths in the OpenNext
// worker bundle with `data:text/javascript,...` empty modules so wrangler
// doesn't pull the (~2.2 MiB) WASM + edge-runtime files into the deploy
// upload. Our app never calls `next/og`'s ImageResponse — the imports
// only exist because OpenNext's `externalImport` helper hard-codes them.
//
// Without this, the worker exceeds the 3 MiB Cloudflare free-tier limit.

import { readFileSync, writeFileSync } from "node:fs";

const BUNDLE = ".open-next/server-functions/default/handler.mjs";
const EMPTY_MODULE = "data:text/javascript,export default {};export const __og_stripped=true";

const before = readFileSync(BUNDLE, "utf-8");
const after = before
  .replaceAll('"next/dist/compiled/@vercel/og/index.edge.js"', JSON.stringify(EMPTY_MODULE))
  .replaceAll('"next/dist/compiled/@vercel/og/index.node.js"', JSON.stringify(EMPTY_MODULE));

if (before === after) {
  console.warn("[strip-vercel-og] no @vercel/og references found; skipping");
} else {
  writeFileSync(BUNDLE, after);
  const before_kb = Math.round(before.length / 1024);
  const after_kb = Math.round(after.length / 1024);
  console.log(`[strip-vercel-og] ${BUNDLE}: ${before_kb} KiB → ${after_kb} KiB`);
}
