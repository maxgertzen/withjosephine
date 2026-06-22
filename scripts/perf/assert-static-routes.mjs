#!/usr/bin/env node
// Deploy-free regression gate for the soft-nav latency fix.
// Runs `next build` and parses the route table; fails if any route that should
// be statically prerendered (○/●) is still dynamic (ƒ). A dynamic public route
// cannot be fully prefetched by next/link, so every click pays the full render.
// Usage:
//   node scripts/perf/assert-static-routes.mjs            # runs next build
//   node scripts/perf/assert-static-routes.mjs --from-log <path>   # parse existing log

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SHOULD_BE_STATIC = ["/", "/privacy", "/terms", "/refund-policy"];

function getBuildOutput() {
  const logFlagIndex = process.argv.indexOf("--from-log");
  if (logFlagIndex !== -1) {
    return readFileSync(process.argv[logFlagIndex + 1], "utf8");
  }
  return execSync("./node_modules/.bin/next build", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseRouteTable(output) {
  const routes = [];
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\[[0-9;]*m/g, "");
    const m = line.match(/^\s*[┌├└]\s+([○●ƒ])\s+(\/\S*)/u);
    if (m) routes.push({ symbol: m[1], path: m[2] });
  }
  return routes;
}

function classify(symbol) {
  if (symbol === "ƒ") return "dynamic";
  if (symbol === "●") return "ssg";
  return "static";
}

const output = getBuildOutput();
const routes = parseRouteTable(output);

if (routes.length === 0) {
  console.error("No route table parsed from build output. Did the build run?");
  process.exit(2);
}

const contentRoutes = routes.filter((r) => !r.path.startsWith("/api/"));
const dynamic = contentRoutes.filter((r) => r.symbol === "ƒ");
const staticCount = contentRoutes.length - dynamic.length;

console.log(`Content routes: ${contentRoutes.length} | static/ssg: ${staticCount} | dynamic: ${dynamic.length}\n`);
for (const r of contentRoutes) {
  console.log(`  ${classify(r.symbol).padEnd(8)} ${r.path}`);
}

const bySymbol = new Map(routes.map((r) => [r.path, r.symbol]));
const regressions = SHOULD_BE_STATIC.map((p) => {
  const symbol = bySymbol.get(p);
  if (!symbol) return { path: p, reason: "not found in route table" };
  if (symbol === "ƒ") return { path: p, reason: "dynamic (ƒ)" };
  return null;
}).filter(Boolean);

if (regressions.length > 0) {
  console.error(`\nFAIL: these routes must be statically prerendered:`);
  for (const { path, reason } of regressions) console.error(`  ${path} — ${reason}`);
  process.exit(1);
}
console.log("\nPASS: all required routes are statically prerendered.");
