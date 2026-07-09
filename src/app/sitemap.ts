import type { MetadataRoute } from "next";
import { SITE, PAGE_SEO } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: `${SITE.url}${PAGE_SEO.home.path}`,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE.url}${PAGE_SEO.board.path}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE.url}${PAGE_SEO.dashboard.path}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];
}
