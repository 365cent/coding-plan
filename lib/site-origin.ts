function firstNonEmpty(...values: Array<string | undefined>) {
  for (const v of values) {
    const s = v?.trim()
    if (s) return s
  }
  return undefined
}

export const SITE_ORIGIN = "https://coding.mcppla.net"

export function getSiteOrigin(): string {
  const explicit = firstNonEmpty(process.env.NEXT_PUBLIC_SITE_URL)
  if (explicit) return explicit.replace(/\/+$/, "")
  return SITE_ORIGIN
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

