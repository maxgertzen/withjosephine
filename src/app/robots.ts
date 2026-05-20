import type { MetadataRoute } from "next";

// Decision locked 2026-05-20: allow citation bots so the site surfaces in
// AI-powered search; block training bots so the content isn't ingested into
// training corpora without permission. The brand and the readings here are
// Josephine's work — citation is fine, ingestion isn't.
const CITATION_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
];

const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"];

// Paths that should never be indexed regardless of crawler. Per-route
// `metadata.robots = { index: false }` already noindexes these for crawlers
// that respect meta tags; this is the belt-and-suspenders layer for crawlers
// that only honor robots.txt.
const PRIVATE_PATHS = [
  "/api/",
  "/auth/",
  "/my-gifts",
  "/my-readings",
  "/gift/claim",
  "/gift/intake",
  "/gift/already-submitted",
  "/listen/",
  "/thank-you/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: CITATION_BOTS, allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: TRAINING_BOTS, disallow: "/" },
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    ],
  };
}
