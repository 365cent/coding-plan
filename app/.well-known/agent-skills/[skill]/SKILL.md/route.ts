import { SKILL_DOCUMENTS, corsHeaders } from "@/lib/agent-discovery"

export const dynamic = "force-static"
export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(SKILL_DOCUMENTS).map((skill) => ({ skill }))
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ skill: string }> },
) {
  const { skill } = await params
  const render = SKILL_DOCUMENTS[skill]
  if (!render) {
    return new Response("Not Found", { status: 404 })
  }
  return new Response(render(), {
    headers: corsHeaders("text/markdown; charset=utf-8"),
  })
}
