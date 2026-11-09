import { corsHeaders, renderAgentCardJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderAgentCardJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
