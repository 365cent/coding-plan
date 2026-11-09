import {
  type Plan,
  lowestFirstMonthInPlan,
  modelMatchesQuery,
  planComparableMonthlyPrice,
  planRequestsPerYuan,
} from "@/lib/plans-data"

type JsonObject = Record<string, unknown>

interface ModelContextTool {
  name: string
  description: string
  inputSchema?: JsonObject
  execute: (
    input: JsonObject,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown> | unknown
  annotations?: { readOnlyHint?: boolean }
}

interface ModelContext {
  registerTool: (
    tool: ModelContextTool,
    options?: { signal?: AbortSignal },
  ) => Promise<void>
}

function getModelContext(): ModelContext | undefined {
  if (typeof document === "undefined" || typeof navigator === "undefined") return undefined
  const docMc = (document as Document & { modelContext?: ModelContext }).modelContext
  const navMc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext
  return docMc ?? navMc
}

function summarizePlan(plan: Plan): JsonObject {
  const reqPerYuan = planRequestsPerYuan(plan)
  return {
    id: plan.id,
    company: plan.company,
    product: plan.product,
    category: plan.category,
    billingUnit: plan.billingUnit,
    comparableMonthlyPriceCny: planComparableMonthlyPrice(plan) ?? null,
    lowestFirstMonthPriceCny: lowestFirstMonthInPlan(plan) ?? null,
    requestsPerYuan: reqPerYuan !== undefined ? Math.round(reqPerYuan * 10) / 10 : null,
    models: plan.models,
    tools: plan.tools,
    officialUrl: plan.links.official,
    notice: plan.notice ?? null,
    tiers: plan.tiers,
  }
}

export function initWebMcp(
  plans: Plan[],
  onApplySearch?: (query: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {}
  if (!("modelContext" in navigator) && !("modelContext" in document)) return () => {}

  const modelContext = getModelContext()
  if (!modelContext?.registerTool) return () => {}

  const teardown = new AbortController()
  const reg = { signal: teardown.signal }

  const onPageHide = () => teardown.abort()
  window.addEventListener("pagehide", onPageHide, { once: true })

  const tools: ModelContextTool[] = [
    {
      name: "search_coding_plans",
      description:
        "Search and filter AI Coding Plans by provider, product name, model (e.g. GLM, Qwen, DeepSeek, Kimi, MiniMax), or IDE tool (e.g. Claude Code, Cursor, Cline).",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keywords (provider, model, or tool name).",
          },
          category: {
            type: "string",
            description: "Optional category filter: 国内大厂 or 其他.",
          },
          billing_unit: {
            type: "string",
            description: "Optional billing unit filter: API请求, Token计费, 积分制, 请求次数, 按量计费.",
          },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const query = String(input.query ?? "").trim()
        const category = String(input.category ?? "").trim()
        const billingUnit = String(input.billing_unit ?? "").trim()

        if (query && onApplySearch) {
          onApplySearch(query)
        }

        const q = query.toLowerCase()
        const matched = plans.filter((p) => {
          if (category && p.category !== category) return false
          if (billingUnit && p.billingUnit !== billingUnit) return false
          if (!q) return true
          return (
            p.id.toLowerCase().includes(q) ||
            p.company.toLowerCase().includes(q) ||
            p.product.toLowerCase().includes(q) ||
            p.models.some((m) => modelMatchesQuery(m, query)) ||
            p.tools.some((t) => t.toLowerCase().includes(q))
          )
        })

        return {
          query,
          count: matched.length,
          plans: matched.map(summarizePlan),
        }
      },
    },
    {
      name: "list_plan_categories",
      description: "List AI Coding Plan categories and billing unit types with counts.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => {
        const categories = ["国内大厂", "其他"].map((cat) => ({
          id: cat,
          count: plans.filter((p) => p.category === cat).length,
        }))
        const billingUnits = Array.from(new Set(plans.map((p) => p.billingUnit))).map((unit) => ({
          unit,
          count: plans.filter((p) => p.billingUnit === unit).length,
        }))
        return { totalPlans: plans.length, categories, billingUnits }
      },
    },
    {
      name: "get_plans_catalog",
      description: "Fetch the full machine-readable AI Coding Plan dataset from GET /api/plans.json.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: async () => {
        try {
          const res = await fetch("/api/plans.json", { credentials: "same-origin" })
          if (!res.ok) return { error: `Failed to load /api/plans.json (${res.status})` }
          return (await res.json()) as JsonObject
        } catch {
          return { error: "Network error loading /api/plans.json" }
        }
      },
    },
    {
      name: "get_plan_details",
      description:
        "Look up a single AI Coding Plan by its id slug (e.g. aliyun-token, ark-agent, ark, tencent, glm, kimi, minimax, tuanjie-codely).",
      inputSchema: {
        type: "object",
        properties: {
          plan_id: {
            type: "string",
            description: "Plan id slug.",
          },
        },
        required: ["plan_id"],
      },
      annotations: { readOnlyHint: true },
      execute: async (input) => {
        const id = String(input.plan_id ?? "").trim()
        const plan = plans.find((p) => p.id === id)
        if (!plan) return { error: `Unknown plan_id: ${id}` }
        return summarizePlan(plan)
      },
    },
  ]

  for (const tool of tools) {
    void modelContext.registerTool(tool, reg).catch(() => {
      // Ignore duplicate or unsupported WebMCP registration errors.
    })
  }

  return () => {
    window.removeEventListener("pagehide", onPageHide)
    teardown.abort()
  }
}
