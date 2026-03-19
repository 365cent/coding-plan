"use client"

import { useState, useMemo } from "react"
import { plans } from "@/lib/plans-data"
import type { PlanCategory } from "@/lib/plans-data"
import { Hero } from "@/components/hero"
import { StatsBar } from "@/components/stats-bar"
import { FilterBar } from "@/components/filter-bar"
import { ViewToggle } from "@/components/view-toggle"
import { PlanCard } from "@/components/plan-card"
import { ComparisonTable } from "@/components/comparison-table"
import { TopFloatingHeader } from "@/components/top-floating-header"
import { TriangleAlert } from "lucide-react"

const CATEGORY_ORDER: PlanCategory[] = ["国内大厂", "御三家", "其他"]

export default function Page() {
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
  }, [])

  const filtered = useMemo(() => {
    let result = plans
    const originalIndex = new Map(plans.map((p, idx) => [p.id, idx]))

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter)
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.company.toLowerCase().includes(q) ||
          p.product.toLowerCase().includes(q) ||
          p.models.some((m) => m.toLowerCase().includes(q)) ||
          p.tools.some((t) => t.toLowerCase().includes(q))
      )
    }

    // Billing filter
    if (billingFilter !== "全部") {
      result = result.filter((p) => p.billingUnit === billingFilter)
    }

    // Default order: 国内大厂 → 御三家 → 其他 (when no category filter)
    const categoryRank = (c: PlanCategory) => CATEGORY_ORDER.indexOf(c)

    // Sort: default order 国内大厂 → 御三家 → 其他, then by sortBy
    result = [...result].sort((a, b) => {
      // Primary: category order when no category filter
      if (!categoryFilter) {
        const ra = categoryRank(a.category)
        const rb = categoryRank(b.category)
        if (ra !== rb) return ra - rb
      }

      const monthlyA = a.tiers
        .filter((t) => !t.isFirstMonthOnly)
        .map((t) => {
          if (t.period === "季") return Math.round(t.price / 3)
          if (t.period === "年") return Math.round(t.price / 12)
          return t.price
        })
      const monthlyB = b.tiers
        .filter((t) => !t.isFirstMonthOnly)
        .map((t) => {
          if (t.period === "季") return Math.round(t.price / 3)
          if (t.period === "年") return Math.round(t.price / 12)
          return t.price
        })
      const priceA = monthlyA.length ? Math.min(...monthlyA) : Infinity
      const priceB = monthlyB.length ? Math.min(...monthlyB) : Infinity

      const getBaseTier = (plan: typeof a) => plan.tiers.find((t) => !t.isFirstMonthOnly)

      const getMonthQuota = (plan: typeof a) => {
        // only comparable for request-count based plans
        if (plan.billingUnit !== "API请求" && plan.billingUnit !== "请求次数") return 0
        const tier = getBaseTier(plan)
        if (!tier) return 0
        if (tier.limitMonthCount) return tier.limitMonthCount
        if (tier.limitWeekCount) return tier.limitWeekCount * 4
        return 0
      }

      const effectiveToolCount = (plan: typeof a) => Math.max(plan.toolCount, plan.tools.length)

      const getValueScore = (plan: typeof a, price: number) => {
        const quota = getMonthQuota(plan)
        if (quota) return quota / price
        return (plan.models.length * 10 + effectiveToolCount(plan) * 5) / price
      }

      const getRequestFreq = (plan: typeof a) => getMonthQuota(plan)

      switch (sortBy) {
        case "default": {
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
  }, [search, billingFilter, categoryFilter, sortBy])

  return (
    <main className="min-h-screen bg-background">
      <TopFloatingHeader />
      <Hero />
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
        {/* View toggle + count */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">
            {filtered.length === plans.length
              ? `共 ${filtered.length} 个平台`
              : `筛选出 ${filtered.length} / ${plans.length} 个平台`}
          </p>
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {/* Content */}
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

        <StatsBar plans={plans} />

        {/* Warning */}
        <div id="faq" className="mt-8 p-4 rounded-xl bg-accent border border-border flex items-start gap-3">
          <TriangleAlert className="h-5 w-5 text-chart-1 shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-1">注意事项</p>
            <p>
              各平台采用不同计量单位（API请求 vs 请求次数 vs Token），直接比较数字无意义。
              1次请求约等于15-20次API请求。5小时/周/月限额可能存在陷阱，
              例如5小时100次不等于一天500次，请以各平台官方最新公告为准。
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          数据来源于各平台官网及社区整理，仅供参考。购买前请前往官网确认最新套餐详情。
        </p>
      </footer>
    </main>
  )
}
