import type { MetadataRoute } from "next";

const CITATION_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
];

const TRAINING_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"];

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
  };
}
