import { corsHeaders, renderLlmsTxt } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderLlmsTxt(), {
    headers: corsHeaders("text/plain; charset=utf-8"),
  })
}
