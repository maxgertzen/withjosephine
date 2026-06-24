#!/usr/bin/env node
// Times the RSC soft-nav payload vs the full HTML document for each route, for
// local before/after comparison of a fix (no deploy needed).
// Usage: node scripts/perf/rsc-nav-probe.mjs [baseUrl] [samples]
// An RSC nav request is a GET with the `RSC: 1` header; without it the server
// returns full HTML instead of the payload.

const BASE_URL = process.argv[2] || process.env.BASE_URL || "http://localhost:3111";
const SAMPLES = Number(process.argv[3] || process.env.SAMPLES || 15);
const WARMUP = 3;

const ROUTES = [
  { label: "home", path: "/" },
  { label: "privacy", path: "/privacy" },
  { label: "terms", path: "/terms" },
  { label: "book:soul-blueprint", path: "/book/soul-blueprint" },
];

const RSC_HEADERS = {
  RSC: "1",
};

function quantile(sortedMs, q) {
  if (sortedMs.length === 0) return NaN;
  const pos = (sortedMs.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sortedMs[base + 1] ?? sortedMs[base];
  return sortedMs[base] + rest * (next - sortedMs[base]);
}

async function timeRequest(url, headers) {
  const start = performance.now();
  const res = await fetch(url, { headers, redirect: "manual" });
  const body = await res.arrayBuffer();
  const elapsed = performance.now() - start;
  return {
    ms: elapsed,
    status: res.status,
    bytes: body.byteLength,
    contentType: res.headers.get("content-type") || "",
  };
}

async function sampleRoute(path, headers) {
  const url = `${BASE_URL}${path}`;
  const samples = [];
  let meta = null;
  for (let i = 0; i < SAMPLES + WARMUP; i++) {
    const r = await timeRequest(url, headers);
    if (i >= WARMUP) {
      samples.push(r.ms);
      if (meta === null) meta = r;
    }
  }
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    median: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    status: meta?.status,
    bytes: meta?.bytes,
    contentType: meta?.contentType,
  };
}

function fmt(n) {
  return Number.isFinite(n) ? `${n.toFixed(0)}ms` : "n/a";
}

async function main() {
  console.log(`RSC nav probe -> ${BASE_URL}  (samples=${SAMPLES}, warmup=${WARMUP})\n`);
  console.log(
    ["route", "rsc median", "rsc p95", "rsc bytes", "rsc type", "html median", "html p95", "status"].join("\t"),
  );
  for (const { label, path } of ROUTES) {
    try {
      const rsc = await sampleRoute(path, RSC_HEADERS);
      const html = await sampleRoute(path, {});
      const rscType = rsc.contentType.includes("x-component") ? "rsc" : `HTML?(${rsc.contentType.split(";")[0]})`;
      console.log(
        [
          label,
          fmt(rsc.median),
          fmt(rsc.p95),
          `${rsc.bytes}B`,
          rscType,
          fmt(html.median),
          fmt(html.p95),
          `${rsc.status}/${html.status}`,
        ].join("\t"),
      );
    } catch (err) {
      console.log(`${label}\tERROR ${err?.message ?? err}`);
    }
  }
}

main();
