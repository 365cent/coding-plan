import { corsHeaders, renderMcpServerCardJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderMcpServerCardJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
