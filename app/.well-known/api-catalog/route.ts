import { API_CATALOG_CONTENT_TYPE, corsHeaders, renderApiCatalogJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderApiCatalogJson(), {
    headers: corsHeaders(API_CATALOG_CONTENT_TYPE, {
      Link: '</.well-known/api-catalog>; rel="api-catalog"',
    }),
  })
}
