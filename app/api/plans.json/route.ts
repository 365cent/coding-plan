import { corsHeaders, renderPlansJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderPlansJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
