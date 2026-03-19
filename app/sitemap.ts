import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/site-origin"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteOrigin() ?? "https://example.invalid"

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}

