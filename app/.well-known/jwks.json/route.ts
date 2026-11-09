import { corsHeaders, renderJwksJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderJwksJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
