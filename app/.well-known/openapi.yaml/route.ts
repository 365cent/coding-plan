import { corsHeaders, renderOpenApiYaml } from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderOpenApiYaml(), {
    headers: corsHeaders("text/yaml; charset=utf-8"),
  })
}
