import { corsHeaders, renderOAuthProtectedResourceJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderOAuthProtectedResourceJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
