import { corsHeaders, renderAuthMd } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderAuthMd(), {
    headers: corsHeaders("text/markdown; charset=utf-8"),
  })
}
