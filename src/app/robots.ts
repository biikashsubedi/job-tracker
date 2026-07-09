import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

// AI / LLM crawlers we explicitly welcome (training + retrieval).
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "cohere-ai",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everyone: crawl everything except the JSON API endpoints.
      { userAgent: "*", allow: "/", disallow: "/api/" },
      // Standard search crawlers, called out explicitly.
      { userAgent: "Googlebot", allow: "/", disallow: "/api/" },
      { userAgent: "Bingbot", allow: "/", disallow: "/api/" },
      // AI crawlers, each explicitly allowed.
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: "/api/",
      })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
