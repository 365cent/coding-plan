"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  type Plan,
  type PlanCategory,
  lowestPaidRegularTier,
  planMonthlyRequestEq,
  planRequestsPerYuan,
  purchasableRegularTiers,
  tierComparableMonthly,
} from "@/lib/plans-data"
import { FilterBar } from "@/components/filter-bar"
import { ViewToggle } from "@/components/view-toggle"
import { PlanCard } from "@/components/plan-card"
import { ComparisonTable } from "@/components/comparison-table"

const CATEGORY_ORDER: PlanCategory[] = ["国内大厂", "其他"]
const DEFAULT_TABLE_LEADER_IDS = ["tencent", "bailian-token-team", "ark-agent", "cursor"] as const

function defaultLeaderRank(planId: string): number {
  const idx = DEFAULT_TABLE_LEADER_IDS.indexOf(planId as (typeof DEFAULT_TABLE_LEADER_IDS)[number])
  return idx === -1 ? DEFAULT_TABLE_LEADER_IDS.length : idx
}

function isFreeSubscription(plan: Plan): boolean {
  const prices = purchasableRegularTiers(plan)
    .map((t) => tierComparableMonthly(t))
    .filter((p) => Number.isFinite(p))
  return prices.length > 0 && Math.max(...prices) === 0
}

function effectiveToolCount(plan: Plan): number {
  return Math.max(plan.toolCount, plan.tools.length)
}

type PlanMetrics = {
  price: number
  free: boolean
  /** 性价比主指标：每元月等效调用次数（有官方可折算配额时） */
  requestsPerYuan: number | undefined
  /** 性价比兜底指标：无配额数据时按模型/工具丰富度估算 */
  fallbackPerYuan: number
  monthlyRequestEq: number
}

function computeMetrics(plan: Plan): PlanMetrics {
  const monthly = purchasableRegularTiers(plan)
    .map((t) => tierComparableMonthly(t))
    .filter((p) => Number.isFinite(p))
  const price = monthly.length ? Math.min(...monthly) : Infinity
  const basic = lowestPaidRegularTier(plan)
  const valuePrice = basic ? tierComparableMonthly(basic) : price
  return {
    price,
    free: isFreeSubscription(plan),
    requestsPerYuan: planRequestsPerYuan(plan),
    fallbackPerYuan:
      valuePrice > 0 && Number.isFinite(valuePrice)
        ? (plan.models.length * 10 + effectiveToolCount(plan) * 5) / valuePrice
        : 0,
    monthlyRequestEq: planMonthlyRequestEq(plan) ?? 0,
  }
}

/** 性价比对比：有官方可折算配额的平台一律排在仅能按模型/工具数估算的平台之前 */
function compareValue(ma: PlanMetrics, mb: PlanMetrics): number {
  if (ma.requestsPerYuan !== undefined || mb.requestsPerYuan !== undefined) {
    if (ma.requestsPerYuan === undefined) return 1
    if (mb.requestsPerYuan === undefined) return -1
    if (ma.requestsPerYuan !== mb.requestsPerYuan) return mb.requestsPerYuan - ma.requestsPerYuan
  }
  return mb.fallbackPerYuan - ma.fallbackPerYuan
}

function compareFreeLast(ma: PlanMetrics, mb: PlanMetrics): number {
  if (ma.free === mb.free) return 0
  return ma.free ? 1 : -1
}

function ClientShellInner({ plans }: { plans: Plan[] }) {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get("q") || ""
  const [search, setSearch] = useState(initialSearch)
  const [billingFilter, setBillingFilter] = useState("全部")
  const [categoryFilter, setCategoryFilter] = useState<PlanCategory | "">("")
  const [sortBy, setSortBy] = useState("default")
  const isByProvider = initialSearch.startsWith("by:provider ")
  const [view, setView] = useState<"cards" | "table">(isByProvider ? "cards" : "table")

  // Sync search state if URL changes (optional, but good practice)
  useEffect(() => {
    const q = searchParams.get("q")
    setSearch(q ?? "")
  }, [searchParams])

  const billingOptions = useMemo(() => {
    const preferred: readonly string[] = ["全部", "API请求", "按量计费", "Token计费", "积分制", "请求次数"]
    const set = new Set<string>(plans.map((p) => p.billingUnit))
    const rest = Array.from(set).filter((x) => !preferred.includes(x))
    return [...preferred.filter((x) => x === "全部" || set.has(x)), ...rest]
  }, [plans])

  const filtered = useMemo(() => {
    let result = plans
    const originalIndex = new Map(plans.map((p, idx) => [p.id, idx]))

    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter)
    }

    if (search) {
      if (search.startsWith("by:provider ")) {
        const providerName = search.slice(12).trim()
        result = result.filter((p) => p.company === providerName)
      } else {
        const q = search.toLowerCase()
        result = result.filter(
          (p) =>
            p.company.toLowerCase().includes(q) ||
            p.product.toLowerCase().includes(q) ||
            p.models.some((m) => m.toLowerCase().includes(q)) ||
            p.tools.some((t) => t.toLowerCase().includes(q)),
        )
      }
    }

    if (billingFilter !== "全部") {
      result = result.filter((p) => p.billingUnit === billingFilter)
    }

    const categoryRank = (c: PlanCategory) => CATEGORY_ORDER.indexOf(c)
    const metrics = new Map(result.map((p) => [p.id, computeMetrics(p)]))

    result = [...result].sort((a, b) => {
      // For non-default sorts, keep category grouping first.
      if (!categoryFilter && sortBy !== "default") {
        const ra = categoryRank(a.category)
        const rb = categoryRank(b.category)
        if (ra !== rb) return ra - rb
      }

      const ma = metrics.get(a.id)!
      const mb = metrics.get(b.id)!

      if (sortBy !== "default") {
        const freeCmp = compareFreeLast(ma, mb)
        if (freeCmp !== 0) return freeCmp
      }

      switch (sortBy) {
        case "default": {
          const leaderDiff = defaultLeaderRank(a.id) - defaultLeaderRank(b.id)
          if (leaderDiff) return leaderDiff
          const freeCmp = compareFreeLast(ma, mb)
          if (freeCmp !== 0) return freeCmp
          const valueCmp = compareValue(ma, mb)
          if (valueCmp !== 0) return valueCmp
          return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0)
        }
        case "price-asc":
          return ma.price - mb.price
        case "price-desc":
          return mb.price - ma.price
        case "value":
          return compareValue(ma, mb)
        case "models":
          return b.models.length - a.models.length
        case "tools":
          return effectiveToolCount(b) - effectiveToolCount(a)
        case "requests":
          return mb.monthlyRequestEq - ma.monthlyRequestEq
        default:
          return 0
      }
    })

    return result
  }, [plans, search, billingFilter, categoryFilter, sortBy])

  return (
    <>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        billingFilter={billingFilter}
        onBillingFilterChange={setBillingFilter}
        billingOptions={billingOptions}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      <div id="plans" className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">
            {filtered.length === plans.length
              ? `共 ${filtered.length} 个平台`
              : `筛选出 ${filtered.length} / ${plans.length} 个平台`}
          </p>
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">未找到匹配的套餐</p>
          </div>
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        ) : (
          <ComparisonTable plans={filtered} />
        )}
      </div>
    </>
  )
}

export function ClientShell({ plans }: { plans: Plan[] }) {
  return (
    <Suspense fallback={<div className="min-h-[400px]" />}>
      <ClientShellInner plans={plans} />
    </Suspense>
  )
}
