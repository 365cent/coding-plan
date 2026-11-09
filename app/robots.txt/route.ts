import { corsHeaders, renderRobotsTxt } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderRobotsTxt(), {
    headers: corsHeaders("text/plain; charset=utf-8"),
  })
}
