import { corsHeaders, renderLlmsFullTxt } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderLlmsFullTxt(), {
    headers: corsHeaders("text/plain; charset=utf-8"),
  })
}
