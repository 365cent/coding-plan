"use client"

import { useMemo, useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  type Plan,
  type PlanCategory,
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
  return idx === -1 ? Number.POSITIVE_INFINITY : idx
}

function isFreeSubscription(plan: Plan): boolean {
  const prices = purchasableRegularTiers(plan)
    .map((t) => tierComparableMonthly(t))
    .filter((p) => Number.isFinite(p))
  return prices.length > 0 && Math.max(...prices) === 0
}

function compareFreeLast(a: Plan, b: Plan): number {
  const freeA = isFreeSubscription(a)
  const freeB = isFreeSubscription(b)
  if (freeA === freeB) return 0
  return freeA ? 1 : -1
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
    const preferred = ["全部", "API请求", "按量计费", "Token计费", "积分制", "请求次数"] as const
    const set = new Set(plans.map((p) => p.billingUnit))
    const rest = Array.from(set).filter((x) => !preferred.includes(x as any))
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

    result = [...result].sort((a, b) => {
      // For non-default sorts, keep category grouping first.
      if (!categoryFilter && sortBy !== "default") {
        const ra = categoryRank(a.category)
        const rb = categoryRank(b.category)
        if (ra !== rb) return ra - rb
      }

      const monthlyA = purchasableRegularTiers(a).map((t) => tierComparableMonthly(t))
      const monthlyB = purchasableRegularTiers(b).map((t) => tierComparableMonthly(t))
      const priceA = monthlyA.length ? Math.min(...monthlyA) : Infinity
      const priceB = monthlyB.length ? Math.min(...monthlyB) : Infinity

      const getBaseTier = (plan: Plan) => purchasableRegularTiers(plan)[0]

      const getMonthQuota = (plan: Plan) => {
        if (plan.billingUnit !== "API请求" && plan.billingUnit !== "请求次数") return 0
        const tier = getBaseTier(plan)
        if (!tier) return 0
        if (tier.limitMonthCount) return tier.limitMonthCount
        if (tier.limitWeekCount) return tier.limitWeekCount * 4
        return 0
      }

      const effectiveToolCount = (plan: Plan) => Math.max(plan.toolCount, plan.tools.length)

      const getValueScore = (plan: Plan, price: number) => {
        if (price <= 0) return 0
        const quota = getMonthQuota(plan)
        if (quota) return quota / price
        return (plan.models.length * 10 + effectiveToolCount(plan) * 5) / price
      }

      const getRequestFreq = (plan: Plan) => getMonthQuota(plan)

      if (sortBy !== "default") {
        const freeCmp = compareFreeLast(a, b)
        if (freeCmp !== 0) return freeCmp
      }

      switch (sortBy) {
        case "default": {
          const leaderA = defaultLeaderRank(a.id)
          const leaderB = defaultLeaderRank(b.id)
          if (leaderA !== leaderB) {
            if (Number.isFinite(leaderA) || Number.isFinite(leaderB)) return leaderA - leaderB
          }
          const freeCmp = compareFreeLast(a, b)
          if (freeCmp !== 0) return freeCmp
          const valueDiff = getValueScore(b, priceB) - getValueScore(a, priceA)
          if (valueDiff !== 0) return valueDiff
          return (originalIndex.get(a.id) ?? 0) - (originalIndex.get(b.id) ?? 0)
        }
        case "price-asc":
          return priceA - priceB
        case "price-desc":
          return priceB - priceA
        case "value":
          return getValueScore(b, priceB) - getValueScore(a, priceA)
        case "models":
          return b.models.length - a.models.length
        case "tools":
          return effectiveToolCount(b) - effectiveToolCount(a)
        case "requests":
          return getRequestFreq(b) - getRequestFreq(a)
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
