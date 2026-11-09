import { corsHeaders, renderOAuthAuthorizationServerJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderOAuthAuthorizationServerJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
