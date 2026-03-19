"use client"

import { useMemo, useState } from "react"
import type { Plan, PlanCategory } from "@/lib/plans-data"
import { FilterBar } from "@/components/filter-bar"
import { ViewToggle } from "@/components/view-toggle"
import { PlanCard } from "@/components/plan-card"
import { ComparisonTable } from "@/components/comparison-table"

const CATEGORY_ORDER: PlanCategory[] = ["国内大厂", "御三家", "其他"]
const DOMESTIC_BIG3_ORDER: Record<string, number> = {
  腾讯云: 0,
  阿里云: 1,
  字节跳动: 2,
}

export function ClientShell({ plans }: { plans: Plan[] }) {
  const [search, setSearch] = useState("")
  const [billingFilter, setBillingFilter] = useState("全部")
  const [categoryFilter, setCategoryFilter] = useState<PlanCategory | "">("")
  const [sortBy, setSortBy] = useState("default")
  const [view, setView] = useState<"cards" | "table">("table")

  const billingOptions = useMemo(() => {
    const preferred = ["全部", "API请求", "按量计费", "请求次数", "Token"] as const
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
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.company.toLowerCase().includes(q) ||
          p.product.toLowerCase().includes(q) ||
          p.models.some((m) => m.toLowerCase().includes(q)) ||
          p.tools.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (billingFilter !== "全部") {
      result = result.filter((p) => p.billingUnit === billingFilter)
    }

    const categoryRank = (c: PlanCategory) => CATEGORY_ORDER.indexOf(c)

    result = [...result].sort((a, b) => {
      if (!categoryFilter) {
        const ra = categoryRank(a.category)
        const rb = categoryRank(b.category)
        if (ra !== rb) return ra - rb
      }

      const monthlyA = a.tiers
        .filter((t) => !t.isFirstMonthOnly)
        .map((t) => (t.period === "季" ? Math.round(t.price / 3) : t.period === "年" ? Math.round(t.price / 12) : t.price))
      const monthlyB = b.tiers
        .filter((t) => !t.isFirstMonthOnly)
        .map((t) => (t.period === "季" ? Math.round(t.price / 3) : t.period === "年" ? Math.round(t.price / 12) : t.price))
      const priceA = monthlyA.length ? Math.min(...monthlyA) : Infinity
      const priceB = monthlyB.length ? Math.min(...monthlyB) : Infinity

      const getBaseTier = (plan: Plan) => plan.tiers.find((t) => !t.isFirstMonthOnly)

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
        const quota = getMonthQuota(plan)
        if (quota) return quota / price
        return (plan.models.length * 10 + effectiveToolCount(plan) * 5) / price
      }

      const getRequestFreq = (plan: Plan) => getMonthQuota(plan)

      switch (sortBy) {
        case "default": {
          if (!categoryFilter && a.category === "国内大厂" && b.category === "国内大厂") {
            const ra = DOMESTIC_BIG3_ORDER[a.company]
            const rb = DOMESTIC_BIG3_ORDER[b.company]
            const aHas = ra !== undefined
            const bHas = rb !== undefined
            if (aHas && bHas && ra !== rb) return ra - rb
            if (aHas !== bHas) return aHas ? -1 : 1
          }
          const ia = originalIndex.get(a.id) ?? 0
          const ib = originalIndex.get(b.id) ?? 0
          return ia - ib
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

