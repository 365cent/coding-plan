function firstNonEmpty(...values: Array<string | undefined>) {
  for (const v of values) {
    const s = v?.trim()
    if (s) return s
  }
  return undefined
}

export function getSiteOrigin(): string | undefined {
  const explicit = firstNonEmpty(
    process.env.NEXT_PUBLIC_SITE_URL,
    // Netlify
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    // Vercel
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  )
  if (explicit) return explicit.replace(/\/+$/, "")

  // Dev-only fallback (never emit localhost in production HTML)
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000"

  // In production builds without a configured origin, return a non-local placeholder
  // to avoid Next.js falling back to localhost in metadata URLs.
  return "https://example.invalid"
}

export function getMetadataBase(): URL | undefined {
  const origin = getSiteOrigin()
  if (!origin) return undefined
  try {
    return new URL(origin)
  } catch {
    return undefined
  }
}

