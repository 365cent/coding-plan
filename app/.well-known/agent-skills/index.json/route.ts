import { corsHeaders, renderAgentSkillsIndexJson } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderAgentSkillsIndexJson(), {
    headers: corsHeaders("application/json; charset=utf-8"),
  })
}
