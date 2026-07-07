import type { MetadataRoute } from "next";

import { siteOrigin } from "@/lib/env";

const CITATION_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
];

const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "CCBot"];

const PRIVATE_PATHS = [
  "/api/",
  "/auth/",
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
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
