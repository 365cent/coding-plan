import type { MetadataRoute } from "next"
import { getSiteOrigin } from "@/lib/site-origin"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteOrigin() ?? "https://example.invalid"

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "Claude-Web", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

