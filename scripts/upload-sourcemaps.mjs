// Sentry sourcemap upload step. Part of the cf:build chain.
//
// Operates on the client-side bundle only. The worker (server) bundle's
// sourcemap is NOT uploaded to Sentry — Debug-ID metadata gets stripped during
// OpenNext's worker init (sentry-javascript#19213), so server frames don't
// reference the uploaded artifacts even when injection succeeds. Tracked in
// docs/POST_LAUNCH_BACKLOG.md; revisit when upstream lands a fix.
//
// Maps are deleted from .open-next/assets unconditionally — they must never
// reach the public asset output regardless of upload status, since serving
// them leaks our source. Upload runs only when SENTRY_AUTH_TOKEN, SENTRY_ORG,
// and SENTRY_PROJECT are all set.

import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";

import { SentryCli } from "@sentry/cli";

const ASSETS_DIR = resolve(".open-next/assets/_next/static");

const { SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT } = process.env;

if (!existsSync(ASSETS_DIR)) {
  console.error(
    `[sentry-sourcemaps] missing — opennextjs-cloudflare build did not produce ${ASSETS_DIR}.`,
  );
  process.exit(1);
}

function findMapFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findMapFiles(path));
    } else if (entry.name.endsWith(".map")) {
      out.push(path);
    }
  }
  return out;
}

function deletePublicMaps() {
  const maps = findMapFiles(ASSETS_DIR);
  for (const map of maps) {
    rmSync(map, { force: true });
  }
  console.log(`[sentry-sourcemaps] removed ${maps.length} .map file(s) from public output.`);
}

try {
  if (!SENTRY_AUTH_TOKEN || !SENTRY_ORG || !SENTRY_PROJECT) {
    console.log(
      "[sentry-sourcemaps] upload skipped — set SENTRY_AUTH_TOKEN, SENTRY_ORG, and " +
        "SENTRY_PROJECT to enable. Maps will still be stripped from public output.",
    );
  } else {
    const cli = new SentryCli(null, {
      authToken: SENTRY_AUTH_TOKEN,
      org: SENTRY_ORG,
      project: SENTRY_PROJECT,
    });
    await cli.execute(["sourcemaps", "inject", ASSETS_DIR], true);
    await cli.execute(["sourcemaps", "upload", ASSETS_DIR], true);
    console.log("[sentry-sourcemaps] upload complete.");
  }
} finally {
  deletePublicMaps();
}
