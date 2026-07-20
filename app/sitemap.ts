import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/site-origin"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteOrigin() ?? "https://example.invalid"
  const lastModified = new Date()

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/ping`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ]
}

