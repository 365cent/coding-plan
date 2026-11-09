import {
  HTTP_MESSAGE_SIGNATURES_DIRECTORY_CONTENT_TYPE,
  corsHeaders,
  renderHttpMessageSignaturesDirectoryJson,
} from "@/lib/agent-discovery"

export const dynamic = "force-static"

export function GET() {
  return new Response(renderHttpMessageSignaturesDirectoryJson(), {
    headers: corsHeaders(HTTP_MESSAGE_SIGNATURES_DIRECTORY_CONTENT_TYPE, {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    }),
  })
}
