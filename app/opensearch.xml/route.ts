import { getSiteOrigin } from "@/lib/site-origin"

export const dynamic = "force-static"

export function GET() {
  const siteUrl = getSiteOrigin() ?? "https://example.invalid"
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>国内Coding Plan对比</ShortName>
  <Description>搜索国内 AI Coding Plan 套餐平台、模型与工具</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${siteUrl}/favicon.ico</Image>
  <Url type="text/html" method="get" template="${siteUrl}/?q={searchTerms}"/>
</OpenSearchDescription>
`
  return new Response(xml, {
    headers: { "Content-Type": "application/opensearchdescription+xml; charset=utf-8" },
  })
}
